import { bagPhotoConfig, bagPreloadImages, bagViewForSection, bagViewerNavigation } from '../data/sac-visuals.js';
import { escapeHtml, icon } from './utils.js';

function sectionToken(sectionId) {
  return String(sectionId || '').split(':').at(-1);
}

function viewerCaption(config, selectedSection, viewKey, groupSelected) {
  if (groupSelected) return 'Sac amovible rouge';
  if (selectedSection && viewKey !== 'face') return selectedSection.label;
  return config.caption;
}

function viewerAlt(config, selectedSection, viewKey, groupSelected) {
  if (groupSelected) return config.labels.amovible || config.labels[viewKey] || config.caption;
  const viewLabel = config.labels[viewKey] || config.labels.face || config.caption;
  return selectedSection && viewKey !== 'face' ? `${viewLabel} — ${selectedSection.label}` : viewLabel;
}

function renderViewerNavigation(container, viewKey) {
  const entries = bagViewerNavigation(container.id);
  if (!entries.length) return '';
  return `<nav class="dynamic-inventory-viewer__nav" aria-label="Vues rapides du contenant">
    ${entries.map((entry) => {
      const route = entry.sectionId ? `container/${container.id}/${entry.sectionId}` : `container/${container.id}`;
      const active = entry.view === viewKey;
      return `<button type="button" class="${active ? 'active' : ''}" data-container-nav="${escapeHtml(route)}" aria-pressed="${active}">${escapeHtml(entry.label)}</button>`;
    }).join('')}
  </nav>`;
}

export function DynamicInventoryViewer({
  container,
  selectedSection,
  itemCount,
  statusHtml,
  groupSelected = false,
  removableCount = 0,
  progress = null
}) {
  const config = bagPhotoConfig(container.id);
  if (!config) return '';

  const viewKey = groupSelected ? 'amovible' : bagViewForSection(container.id, selectedSection?.id);
  const imagePath = config.views[viewKey] || config.views.face;
  const caption = viewerCaption(config, selectedSection, viewKey, groupSelected);
  const alt = viewerAlt(config, selectedSection, viewKey, groupSelected);
  const scopeCount = groupSelected ? removableCount : selectedSection && viewKey !== 'face' ? selectedSection.items.length : itemCount;
  const scopeLabel = groupSelected
    ? `4 sous-compartiments · ${scopeCount} éléments`
    : selectedSection && viewKey !== 'face'
      ? `${scopeCount} élément${scopeCount > 1 ? 's' : ''}`
      : `${scopeCount} éléments au total`;
  const progressValue = Number.isFinite(progress?.value) ? Math.max(0, Math.min(100, progress.value)) : null;
  const progressLabel = progress?.label || scopeLabel;
  const preloadImages = bagPreloadImages(container.id).filter((path) => path === config.views.face || path === imagePath);

  return `<section class="dynamic-inventory-viewer" data-dynamic-inventory-viewer data-view-key="${escapeHtml(viewKey)}" data-sac-view="${escapeHtml(viewKey)}" aria-label="Visionneuse dynamique du ${escapeHtml(config.name)}">
    <div class="dynamic-inventory-viewer__panel">
      <button type="button" class="dynamic-inventory-viewer__image-button" data-viewer-fullscreen-open aria-label="Afficher ${escapeHtml(caption)} en plein écran">
        <img class="dynamic-inventory-viewer__image" src="${escapeHtml(imagePath)}" alt="${escapeHtml(alt)}" decoding="async" fetchpriority="high">
        <span class="dynamic-inventory-viewer__expand" aria-hidden="true">${icon('expand', 18)}</span>
      </button>
      <div class="dynamic-inventory-viewer__identity" aria-live="polite">
        <img src="${escapeHtml(imagePath)}" alt="" width="48" height="48" aria-hidden="true">
        <span><strong>${escapeHtml(caption)}</strong><small>${escapeHtml(progressLabel)}</small></span>
        ${progressValue === null ? statusHtml : `<span class="dynamic-inventory-viewer__progress" aria-label="Progression du contrôle : ${progressValue} %"><i style="width:${progressValue}%"></i><b>${progressValue}%</b></span>`}
        <button type="button" class="dynamic-inventory-viewer__compact-expand" data-viewer-fullscreen-open aria-label="Afficher l’image en plein écran">${icon('expand', 18)}</button>
      </div>
      <div class="dynamic-inventory-viewer__caption"><span><strong>${escapeHtml(caption)}</strong><small>${escapeHtml(scopeLabel)}</small></span>${statusHtml}</div>
      ${progressValue === null ? '' : `<div class="dynamic-inventory-viewer__large-progress"><span style="width:${progressValue}%"></span><small>${escapeHtml(progressLabel)} · ${progressValue}%</small></div>`}
      ${renderViewerNavigation(container, viewKey)}
    </div>
    <div class="dynamic-inventory-viewer__preload" aria-hidden="true">${preloadImages.filter((path) => path !== imagePath).map((path) => `<img src="${escapeHtml(path)}" alt="" width="1" height="1" decoding="async">`).join('')}</div>
    <div class="dynamic-inventory-viewer__fullscreen" data-viewer-fullscreen hidden role="dialog" aria-modal="true" aria-label="${escapeHtml(caption)} en plein écran">
      <button type="button" class="dynamic-inventory-viewer__close" data-viewer-fullscreen-close aria-label="Fermer le plein écran">${icon('close', 22)}</button>
      <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(alt)}" decoding="async">
      <strong>${escapeHtml(caption)}</strong>
    </div>
  </section>`;
}
