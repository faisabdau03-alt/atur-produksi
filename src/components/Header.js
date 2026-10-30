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
  const isClickable = Boolean(options.clickable || options.action || options.filter || options.page || options.stat || options.statType || options.target);
  const action = options.action || (options.filter ? 'filter-report' : '');
  const actionAttr = action ? ` data-action="${action}"` : '';
  const filterAttr = options.filter ? ` data-filter="${options.filter}"` : '';
  const statAttr = options.stat ? ` data-stat="${options.stat}"` : (options.statType ? ` data-stat="${options.statType}"` : '');
  const pageAttr = options.page ? ` data-page="${options.page}"` : '';
  const targetAttr = options.target ? ` data-target="${options.target}"` : '';
  const monthAttr = options.month ? ` data-month="${options.month}"` : '';
  const dateAttr = options.date ? ` data-date="${options.date}"` : '';
  const idAttr = options.id ? ` data-id="${options.id}"` : '';
  const titleHint = options.hint ? ` title="${escapeHtml(options.hint)}"` : '';
  const activeStyle = options.active ? ' box-shadow: 0 0 0 3px #ffffff, 0 0 0 6px rgba(0,0,0,0.35); transform: translateY(-2px);' : '';

  // Map tone to AdminLTE classic bg colors
  let bgClass = 'bg-aqua';
  if (tone.includes('green') || tone.includes('success')) bgClass = 'bg-green';
  else if (tone.includes('orange') || tone.includes('yellow') || tone.includes('warning')) bgClass = 'bg-yellow';
  else if (tone.includes('red') || tone.includes('danger')) bgClass = 'bg-red';
  else if (tone.includes('purple')) bgClass = 'bg-purple';
  else if (tone.includes('blue')) bgClass = 'bg-blue';

  const allAttrs = `${actionAttr}${filterAttr}${statAttr}${pageAttr}${targetAttr}${monthAttr}${dateAttr}${idAttr}`;

  return `
    <div class="small-box ${bgClass}"${allAttrs}${titleHint} style="${isClickable ? 'cursor:pointer;' : ''}${activeStyle}">
      <div class="inner">
        <h3>${value}</h3>
        <p>${escapeHtml(label)}</p>
        <small class="small-box-note">${escapeHtml(note)}</small>
      </div>
      <div class="icon">
        ${iconSvg}
      </div>
      <a href="#" class="small-box-footer"${allAttrs}>
        Lihat rincian <span aria-hidden="true">→</span>
      </a>
    </div>
  `;
}
