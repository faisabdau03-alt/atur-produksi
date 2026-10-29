export function heading(eyebrow, title, description, action = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="muted">${description}</p></div>${action}</div>`;
}

export function statCard(label, value, note, icon, tone = '', options = {}) {
  const isClickable = Boolean(options.action);
  const actionAttr = isClickable ? ` data-action="${options.action}"` : '';
  const filterAttr = options.filter ? ` data-filter="${options.filter}"` : '';
  const dateAttr = options.date ? ` data-date="${options.date}"` : '';
  const cursorStyle = isClickable ? ' cursor: pointer;' : '';
  return `<div class="stat-card ${tone}"${actionAttr}${filterAttr}${dateAttr} style="${cursorStyle}">
    <div class="stat-top"><p class="stat-label">${label}</p><span class="stat-icon" aria-hidden="true">${icon}</span></div>
    <div class="stat-value">${value}</div>
    <p class="stat-note">${note}</p>
  </div>`;
}
