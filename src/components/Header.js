import { escapeHtml } from '../utils/sanitize.js';

export function heading(eyebrow, title, description, actions = '') {
  return `
    <header class="page-header">
      <div class="page-title-box">
        <span class="page-eyebrow">${escapeHtml(eyebrow)}</span>
        <h1 class="page-title">${escapeHtml(title)}</h1>
        <p class="page-desc">${escapeHtml(description)}</p>
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </header>
  `;
}

export function statCard(label, value, note, iconSvg = '', tone = 'icon-blue', options = {}) {
  const isClickable = Boolean(options.clickable || options.action || options.filter);
  const actionAttr = options.action ? ` data-action="${options.action}"` : (options.filter ? ` data-action="filter-report" data-filter="${options.filter}"` : '');
  const statAttr = options.stat ? ` data-stat="${options.stat}"` : (options.statType ? ` data-stat="${options.statType}"` : '');
  const activeClass = options.isActive ? ' is-active' : '';
  const clickableClass = isClickable ? ' is-clickable' : '';
  const titleHint = options.hint ? ` title="${escapeHtml(options.hint)}"` : '';

  return `
    <div class="stat-card${clickableClass}${activeClass}"${actionAttr}${statAttr}${titleHint}>
      <div class="stat-card-top">
        <span class="stat-label">${escapeHtml(label)}</span>
        <div class="stat-icon-wrap ${tone}">
          ${iconSvg}
        </div>
      </div>
      <div class="stat-value">${value}</div>
      <p class="stat-sublabel">${escapeHtml(note)}</p>
    </div>
  `;
}
