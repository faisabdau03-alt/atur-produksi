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
  const isClickable = Boolean(options.clickable || options.action || options.filter);
  const actionAttr = options.action ? ` data-action="${options.action}"` : (options.filter ? ` data-action="filter-report" data-filter="${options.filter}"` : '');
  const statAttr = options.stat ? ` data-stat="${options.stat}"` : (options.statType ? ` data-stat="${options.statType}"` : '');
  const titleHint = options.hint ? ` title="${escapeHtml(options.hint)}"` : '';

  // Map tone to AdminLTE classic bg colors
  let bgClass = 'bg-aqua';
  if (tone.includes('green') || tone.includes('success')) bgClass = 'bg-green';
  else if (tone.includes('orange') || tone.includes('yellow') || tone.includes('warning')) bgClass = 'bg-yellow';
  else if (tone.includes('red') || tone.includes('danger')) bgClass = 'bg-red';
  else if (tone.includes('purple')) bgClass = 'bg-purple';
  else if (tone.includes('blue')) bgClass = 'bg-blue';

  return `
    <div class="small-box ${bgClass}"${actionAttr}${statAttr}${titleHint}${isClickable ? ' style="cursor:pointer;"' : ''}>
      <div class="inner">
        <h3>${value}</h3>
        <p>${escapeHtml(label)}</p>
        <small class="small-box-note">${escapeHtml(note)}</small>
      </div>
      <div class="icon">
        ${iconSvg}
      </div>
      <a href="#" class="small-box-footer">
        Lihat rincian <span aria-hidden="true">→</span>
      </a>
    </div>
  `;
}
