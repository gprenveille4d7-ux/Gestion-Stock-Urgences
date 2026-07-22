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
  return `<div class="dynamic-inventory-viewer__nav-shell" data-viewer-nav-shell>
    <nav class="dynamic-inventory-viewer__nav" aria-label="Vues rapides du contenant">
    ${entries.map((entry) => {
      const route = entry.sectionId ? `container/${container.id}/${entry.sectionId}` : `container/${container.id}`;
      const active = entry.view === viewKey;
      return `<button type="button" class="${active ? 'active' : ''}" data-container-nav="${escapeHtml(route)}" aria-pressed="${active}"${active ? ' aria-current="true"' : ''}>${escapeHtml(entry.label)}</button>`;
    }).join('')}
    </nav>
  </div>`;
}

function renderProgress(value, label, className) {
  if (value === null) return '';
  return `<div class="${className}" aria-label="Progression du contrôle : ${value} %">
    <span class="inventory-progress-track" aria-hidden="true"><i style="width:${value}%"></i></span>
    <small>${escapeHtml(label)}</small><b>${value}%</b>
  </div>`;
}

function renderFullscreenGallery(container, config, viewKey, caption) {
  const entries = bagViewerNavigation(container.id);
  const slides = entries.length ? entries : [{ label: caption, view: viewKey, sectionId: null }];
  const activeIndex = Math.max(0, slides.findIndex((entry) => entry.view === viewKey));
  return `<div class="dynamic-inventory-viewer__fullscreen" data-viewer-fullscreen data-active-slide="${activeIndex}" hidden role="dialog" aria-modal="true" aria-label="${escapeHtml(caption)} en plein écran">
    <div class="dynamic-inventory-viewer__fullscreen-bar">
      <span class="dynamic-inventory-viewer__gallery-count" data-viewer-gallery-count aria-live="polite">${activeIndex + 1} / ${slides.length}</span>
      <button type="button" class="dynamic-inventory-viewer__close" data-viewer-fullscreen-close aria-label="Fermer le plein écran">${icon('close', 22)}</button>
    </div>
    <div class="dynamic-inventory-viewer__gallery" data-viewer-gallery>
      ${slides.map((entry, index) => {
        const path = config.views[entry.view] || config.views.face;
        const route = entry.sectionId ? `container/${container.id}/${entry.sectionId}` : `container/${container.id}`;
        return `<figure class="dynamic-inventory-viewer__slide${index === activeIndex ? ' active' : ''}" data-viewer-slide data-container-route="${escapeHtml(route)}" data-slide-label="${escapeHtml(entry.label)}"${index === activeIndex ? '' : ' hidden'}>
          <img src="${escapeHtml(path)}" data-viewer-image data-fallback-src="${escapeHtml(config.views.face)}" alt="${escapeHtml(config.labels[entry.view] || entry.label)}" decoding="async">
          <figcaption>${escapeHtml(entry.label)}</figcaption>
        </figure>`;
      }).join('')}
    </div>
    ${slides.length > 1 ? `<div class="dynamic-inventory-viewer__gallery-controls" aria-label="Navigation dans les images">
      <button type="button" data-viewer-gallery-prev aria-label="Image précédente">${icon('chevron', 20)}</button>
      <span>Balayer pour changer de vue</span>
      <button type="button" data-viewer-gallery-next aria-label="Image suivante">${icon('chevron', 20)}</button>
    </div>` : ''}
  </div>`;
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
  const fallbackNote = imagePath === config.views.face ? '' : '<span class="dynamic-inventory-viewer__missing" data-viewer-missing hidden>Vue détaillée bientôt disponible</span>';

  return `<section class="dynamic-inventory-viewer" data-dynamic-inventory-viewer data-view-key="${escapeHtml(viewKey)}" data-sac-view="${escapeHtml(viewKey)}" aria-label="Visionneuse dynamique du ${escapeHtml(config.name)}">
    <div class="dynamic-inventory-viewer__panel dynamic-inventory-viewer__expanded">
      <button type="button" class="dynamic-inventory-viewer__image-button" data-viewer-fullscreen-open aria-label="Afficher ${escapeHtml(caption)} en plein écran">
        <img class="dynamic-inventory-viewer__image" src="${escapeHtml(imagePath)}" data-viewer-image data-fallback-src="${escapeHtml(config.views.face)}" alt="${escapeHtml(alt)}" decoding="async" fetchpriority="high">
        ${fallbackNote}
        <span class="dynamic-inventory-viewer__expand" aria-hidden="true">${icon('expand', 18)}</span>
      </button>
      <div class="dynamic-inventory-viewer__caption">
        <span><em>${escapeHtml(container.label)}</em><strong>${escapeHtml(caption)}</strong><small>${escapeHtml(scopeLabel)}</small></span>
        ${statusHtml}
      </div>
      ${renderProgress(progressValue, progressLabel, 'dynamic-inventory-viewer__large-progress')}
      ${renderViewerNavigation(container, viewKey)}
    </div>
    <div class="dynamic-inventory-viewer__panel dynamic-inventory-viewer__compact" aria-live="polite" aria-hidden="true">
      <img src="${escapeHtml(imagePath)}" data-viewer-image data-fallback-src="${escapeHtml(config.views.face)}" alt="" width="54" height="54" aria-hidden="true">
      <span><em>${escapeHtml(container.label)}</em><strong>${escapeHtml(caption)}</strong><small>${escapeHtml(progressLabel)}</small></span>
      ${progressValue === null ? statusHtml : renderProgress(progressValue, progressLabel, 'dynamic-inventory-viewer__progress')}
      ${viewKey === 'face' ? '' : `<button type="button" class="dynamic-inventory-viewer__overview" data-container-nav="container/${escapeHtml(container.id)}" aria-label="Revenir à la vue générale">${icon('home', 17)}</button>`}
      <button type="button" class="dynamic-inventory-viewer__compact-expand" data-viewer-fullscreen-open aria-label="Afficher l’image en plein écran">${icon('expand', 18)}</button>
    </div>
    <div class="dynamic-inventory-viewer__preload" aria-hidden="true">${preloadImages.filter((path) => path !== imagePath).map((path) => `<img src="${escapeHtml(path)}" alt="" width="1" height="1" decoding="async">`).join('')}</div>
    ${renderFullscreenGallery(container, config, viewKey, caption)}
  </section>`;
}
