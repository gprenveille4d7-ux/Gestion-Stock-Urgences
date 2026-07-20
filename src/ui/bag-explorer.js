import { escapeHtml, icon } from './utils.js';

export function normalizeBagExplorerIndex(index, length) {
  const size = Math.max(0, Number(length) || 0);
  if (!size) return 0;
  return ((Number(index) || 0) % size + size) % size;
}

function sectionMatches(section, sectionId) {
  return section?.id === sectionId || section?.id?.endsWith(`:${sectionId}`);
}

export function bagExplorerViewIndex(config, sectionId) {
  if (!sectionId || !Array.isArray(config?.views)) return -1;
  let decoded = String(sectionId);
  try { decoded = decodeURIComponent(decoded); } catch { /* Conserver la valeur brute. */ }
  return config.views.findIndex((view) => (view.sectionIds || []).some((id) => decoded === id || decoded.endsWith(`:${id}`)));
}

export function bagExplorerSelection(container, config, requestedIndex = 0) {
  const views = Array.isArray(config?.views) ? config.views : [];
  const index = normalizeBagExplorerIndex(requestedIndex, views.length);
  const view = views[index] || null;
  const sections = (view?.sectionIds || [])
    .map((sectionId) => container?.sections?.find((section) => sectionMatches(section, sectionId)))
    .filter(Boolean);
  return { index, view, sections, views };
}

function defaultItemMarkup(item, index) {
  return `<div class="inventory-line bag-explorer-reveal" style="--item-index:${index}"><span class="inventory-quantity">${Number(item.expectedQuantity)}×</span><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.category)} · unité : ${escapeHtml(item.unit)}</small></span></div>`;
}

function illustrationMarkup(view, color) {
  return `<div class="bag-explorer-illustration" data-visual="${escapeHtml(view.visual || 'closed')}" data-color="${escapeHtml(color || 'neutre')}" aria-hidden="true">
    <span class="bag-explorer-handle"></span>
    <span class="bag-explorer-shell"><span class="bag-explorer-panel panel-left"></span><span class="bag-explorer-panel panel-center"></span><span class="bag-explorer-panel panel-right"></span><span class="bag-explorer-pocket"></span><span class="bag-explorer-cross"></span></span>
  </div>`;
}

function contentMarkup(selection, renderItem) {
  const { view, sections } = selection;
  if (!sections.length) return `<div class="bag-explorer-empty bag-explorer-reveal" style="--item-index:0">${icon(view?.id === 'closed' ? 'bag' : 'plus', 22)}<p>${escapeHtml(view?.emptyMessage || 'Aucun contenu renseigné pour cette vue.')}</p></div>`;
  let itemIndex = 0;
  if (view.presentation === 'groups') {
    return sections.map((section, groupIndex) => `<section class="bag-explorer-group bag-explorer-reveal" style="--item-index:${groupIndex}"><header><strong>${escapeHtml(section.label.replace(/^Sac amovible rouge · /, ''))}</strong><small>${section.items.length} élément${section.items.length > 1 ? 's' : ''}</small></header><div class="inventory-line-list">${section.items.map((item) => renderItem(item, itemIndex++)).join('')}</div></section>`).join('');
  }
  return `<div class="inventory-line-list">${sections.flatMap((section) => section.items).map((item) => renderItem(item, itemIndex++)).join('')}</div>`;
}

export function renderBagExplorer(container, config, options = {}) {
  const selection = bagExplorerSelection(container, config, options.index);
  if (!selection.view) return '';
  const direction = options.direction === 'previous' ? 'previous' : 'next';
  const itemCount = selection.sections.reduce((sum, section) => sum + section.items.length, 0);
  const renderItem = options.renderItem || defaultItemMarkup;
  return `<section class="bag-explorer" data-bag-explorer="${escapeHtml(container.id)}" data-view-index="${selection.index}" data-view-count="${selection.views.length}" tabindex="0" aria-roledescription="carrousel" aria-label="Explorer ${escapeHtml(container.label)}">
    <div class="bag-explorer-heading"><div><span>Vue ${selection.index + 1} sur ${selection.views.length}</span><h2>${escapeHtml(selection.view.label)}</h2></div>${itemCount ? `<strong>${itemCount} élément${itemCount > 1 ? 's' : ''}</strong>` : ''}</div>
    <div class="bag-explorer-stage" data-bag-swipe="${escapeHtml(container.id)}">
      <button type="button" class="bag-explorer-arrow previous" data-bag-explorer-step="-1" aria-label="Vue précédente">${icon('back', 19)}</button>
      <div class="bag-explorer-scene is-${direction}">${illustrationMarkup(selection.view, container.color)}</div>
      <button type="button" class="bag-explorer-arrow next" data-bag-explorer-step="1" aria-label="Vue suivante">${icon('chevron', 19)}</button>
    </div>
    <div class="bag-explorer-dots" role="tablist" aria-label="Vues du sac">${selection.views.map((view, index) => `<button type="button" role="tab" aria-label="${escapeHtml(view.label)}" aria-selected="${index === selection.index}" class="${index === selection.index ? 'active' : ''}" data-bag-explorer-index="${index}"></button>`).join('')}</div>
    <p class="bag-explorer-swipe-hint">Balayez horizontalement pour manipuler le sac</p>
    <div class="bag-explorer-content" aria-live="polite">${contentMarkup(selection, renderItem)}${options.footer || ''}</div>
  </section>`;
}
