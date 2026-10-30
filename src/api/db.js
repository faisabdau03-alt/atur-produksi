import { getAuthHeaders, apiRequest } from './client.js';

export const db = {
  auth: {
    async getSession() {
      const token = localStorage.getItem('jw_session_token');
      const cachedUserStr = localStorage.getItem('jw_session_user');
      if (!token) return { data: { session: null }, error: null };

      let cachedUser = null;
      if (cachedUserStr) {
        try { cachedUser = JSON.parse(cachedUserStr); } catch (_) {}
      }

      try {
        const res = await apiRequest('/auth/me', { method: 'GET' });
        if (res && res.ok && res.user) {
          localStorage.setItem('jw_session_user', JSON.stringify(res.user));
          return { data: { session: { user: res.user, access_token: token } }, error: null };
        }
      } catch (err) {
        const msg = String(err?.message || '');
        const isExpiredOrInvalid = msg.includes('401') || msg.includes('kedaluwarsa') || msg.includes('Sesi belum') || msg.includes('Unauthorized');
        if (isExpiredOrInvalid) {
          localStorage.removeItem('jw_session_token');
          localStorage.removeItem('jw_session_user');
          return { data: { session: null }, error: null };
        }
        // Jika server sedang offline / restart sementara, gunakan sesi cache agar tidak ke-logout saat refresh
        if (cachedUser) {
          console.warn('[Session] Menggunakan sesi cache pengguna:', cachedUser.username);
          return { data: { session: { user: cachedUser, access_token: token } }, error: null };
        }
      }

      localStorage.removeItem('jw_session_token');
      localStorage.removeItem('jw_session_user');
      return { data: { session: null }, error: null };
    },

    async signInWithPassword({ email, password }) {
      try {
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: { identifier: email, password },
        });

        if (!res || !res.ok) {
          return { data: { user: null }, error: new Error(res?.error || 'ID Pengguna atau kata sandi tidak valid') };
        }

        localStorage.setItem('jw_session_token', res.token);
        if (res.user) {
          localStorage.setItem('jw_session_user', JSON.stringify(res.user));
        }
        return { data: { user: res.user, session: { access_token: res.token, user: res.user } }, error: null };
      } catch (err) {
        return { data: { user: null }, error: err };
      }
    },

    async signOut() {
      const token = localStorage.getItem('jw_session_token');
      if (token) {
        try {
          await apiRequest('/auth/logout', { method: 'POST' });
        } catch (_) {}
      }
      localStorage.removeItem('jw_session_token');
      localStorage.removeItem('jw_session_user');
      return { error: null };
    },
  },

  from(table) {
    const endpoint = table === 'inventory_movements' ? 'inventory'
      : table === 'cash_transactions' ? 'cash'
      : table === 'payroll_records' ? 'payroll'
      : table === 'payroll_payouts' ? 'payouts'
      : table;

    const filters = [];
    let isSingle = false;

    const builder = {
      order() {
        return builder;
      },
      eq(field, val) {
        filters.push({ field, val });
        return builder;
      },
      maybeSingle() {
        isSingle = true;
        return builder;
      },
      single() {
        isSingle = true;
        return builder;
      },
      async then(resolve, reject) {
        try {
          const res = await fetch('/api/' + endpoint, { headers: getAuthHeaders(false) }).then((r) => r.json());
          let items = res.data || [];
          for (const f of filters) {
            items = items.filter((x) => String(x[f.field]) === String(f.val));
          }
          if (isSingle) {
            resolve({ data: items[0] || null, error: res.error || null });
          } else {
            resolve({ data: items, error: res.error || null });
          }
        } catch (err) {
          resolve({ data: isSingle ? null : [], error: err });
        }
      },
    };

    return {
      select() {
        return builder;
      },
      async insert(payload) {
        try {
          const res = await fetch('/api/' + endpoint, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify(payload),
          }).then((r) => r.json());
          return { data: res.data || null, error: res.error ? new Error(res.error) : null };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      update(payload) {
        return {
          async eq(field, val) {
            try {
              const res = await fetch('/api/' + endpoint + '?id=' + encodeURIComponent(val), {
                method: 'PUT',
                headers: getAuthHeaders(true),
                body: JSON.stringify(payload),
              }).then((r) => r.json());
              return { data: res.data || null, error: res.error ? new Error(res.error) : null };
            } catch (err) {
              return { data: null, error: err };
            }
          },
        };
      },
      delete() {
        return {
          async eq(field, val) {
            try {
              const res = await fetch('/api/' + endpoint + '?id=' + encodeURIComponent(val), {
                method: 'DELETE',
                headers: getAuthHeaders(false),
              }).then((r) => r.json());
              return { data: res.data || null, error: res.error ? new Error(res.error) : null };
            } catch (err) {
              return { data: null, error: err };
            }
          },
        };
      },
    };
  },
};
