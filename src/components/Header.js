import { escapeHtml } from '../utils/sanitize.js';
import { Icons } from './Icons.js';

export function heading(eyebrow, title, description, actions = '') {
  return `
    <section class="content-header">
      <h1>
        ${escapeHtml(title)}
        <small>${escapeHtml(description || eyebrow)}</small>
      </h1>
      <ol class="breadcrumb">
        <li><a href="#" data-page="dashboard">${Icons.dashboard('icon-svg', 13)} Home</a></li>
        <li class="active">${escapeHtml(title)}</li>
      </ol>
      ${actions ? `<div class="content-header-actions" style="margin-top: 8px;">${actions}</div>` : ''}
    </section>
  `;
}

export function statCard(label, value, note, iconSvg = '', tone = 'icon-blue', options = {}) {
  const showFooter = options.footer !== false && !options.hideFooter;
  const isClickable = Boolean(showFooter && (options.clickable || options.action || options.filter || options.page || options.stat || options.statType || options.target));
  const action = options.action || (options.filter ? 'filter-report' : '');
  const actionAttr = action && isClickable ? ` data-action="${action}"` : '';
  const filterAttr = options.filter && isClickable ? ` data-filter="${options.filter}"` : '';
  const statAttr = (options.stat ? ` data-stat="${options.stat}"` : (options.statType ? ` data-stat="${options.statType}"` : ''));
  const pageAttr = options.page && isClickable ? ` data-page="${options.page}"` : '';
  const targetAttr = options.target && isClickable ? ` data-target="${options.target}"` : '';
  const monthAttr = options.month ? ` data-month="${options.month}"` : '';
  const dateAttr = options.date ? ` data-date="${options.date}"` : '';
  const idAttr = options.id ? ` data-id="${options.id}"` : '';
  const titleHint = options.hint ? ` title="${escapeHtml(options.hint)}"` : '';

  // Tone styling for modern SaaS industrial style
  let toneIconClass = 'icon-tone-blue';
  let toneBadgeClass = 'badge-info';
  let valueColorStyle = '';

  const toneLower = String(tone).toLowerCase();
  if (toneLower.includes('green') || toneLower.includes('success')) {
    toneIconClass = 'icon-tone-green';
    toneBadgeClass = 'badge-success';
  } else if (toneLower.includes('orange') || toneLower.includes('yellow') || toneLower.includes('warning')) {
    toneIconClass = 'icon-tone-amber';
    toneBadgeClass = 'badge-warning';
  } else if (toneLower.includes('red') || toneLower.includes('danger')) {
    toneIconClass = 'icon-tone-rose';
    toneBadgeClass = 'badge-danger';
    valueColorStyle = ' style="color: #e11d48;"';
  } else if (toneLower.includes('purple')) {
    toneIconClass = 'icon-tone-purple';
    toneBadgeClass = 'badge-info';
    valueColorStyle = ' style="color: #7c3aed;"';
  } else if (toneLower.includes('blue')) {
    toneIconClass = 'icon-tone-blue';
    toneBadgeClass = 'badge-info';
  }

  const activeClass = options.active ? ' is-active' : '';
  const allAttrs = isClickable ? `${actionAttr}${filterAttr}${statAttr}${pageAttr}${targetAttr}${monthAttr}${dateAttr}${idAttr}` : '';

  return `
    <div class="modern-kpi-card${activeClass}"${allAttrs}${titleHint} style="${isClickable ? 'cursor:pointer;' : ''}">
      <div class="kpi-card-header">
        <span class="kpi-card-title">${escapeHtml(label)}</span>
        <div class="kpi-card-icon ${toneIconClass}">
          ${iconSvg}
        </div>
      </div>
      <div class="kpi-card-value"${valueColorStyle}>${value}</div>
      <div class="kpi-card-footer">
        <span class="kpi-badge ${toneBadgeClass}">${escapeHtml(note)}</span>
        ${showFooter ? `
          <span class="kpi-link-arrow">Lihat rincian →</span>
        ` : ''}
      </div>
    </div>
  `;
}
