import { escapeHtml, icon } from '../../ui/utils.js';

const ASSET_ROOT = './assets/sacs/sac-rouge/ampoulier';
const MANIFEST_PATH = `${ASSET_ROOT}/ampoulier-inventaire-confirme.json`;
const OVERVIEW_SIZE = { width: 1536, height: 1536 };
const NET_SIZE = { width: 820, height: 1220 };
const GUIDE_DURATION_MS = 2100;
const AMPOULE_SECTION_IDS = new Set(['ampoulier-gauche', 'ampoulier-droit', 'ampoulier-interne']);

const TEXT_REPAIRS = new Map([
  ['â€™', '’'], ['â€“', '–'], ['Ã€', 'À'], ['Ã‰', 'É'], ['Ã©', 'é'],
  ['Ã¨', 'è'], ['Ãª', 'ê'], ['Ã«', 'ë'], ['Ã®', 'î'], ['Ã¯', 'ï'],
  ['Ã´', 'ô'], ['Ã¹', 'ù'], ['Ã»', 'û'], ['Ã§', 'ç']
]);

const VIEW_TABS = [
  { id: 'vue-generale', label: 'Vue générale' },
  { id: 'compartiment-gauche', label: 'Gauche' },
  { id: 'compartiment-droit', label: 'Droite' },
  { id: 'filet-gauche', label: 'Filet G.' },
  { id: 'filet-droit', label: 'Filet D.' }
];

function repairText(value) {
  let repaired = String(value || '');
  TEXT_REPAIRS.forEach((replacement, source) => {
    repaired = repaired.split(source).join(replacement);
  });
  return repaired;
}

function sectionToken(sectionId) {
  return String(sectionId || '').split(':').at(-1);
}

export function isEmergencyAmpouleCaseSection(containerId, sectionId) {
  return containerId === 'sac-rouge-solutes' && AMPOULE_SECTION_IDS.has(sectionToken(sectionId));
}

export function renderEmergencyAmpouleCaseHost() {
  return `<section class="emergency-ampoule-case" data-emergency-ampoule-case-root aria-label="Ampoulier interactif du sac rouge">
    <div class="emergency-ampoule-case__loading" role="status">
      <span class="emergency-ampoule-case__spinner" aria-hidden="true"></span>
      <span>Préparation de l’ampoulier…</span>
    </div>
  </section>`;
}

function normalizeAssetPath(asset) {
  const relative = String(asset || '').replace(/^\.\//, '').replace(/^ampoulier\//, '');
  return `${ASSET_ROOT}/${relative}`;
}

function zoneItems(zone) {
  return zone.rows
    ? zone.rows.flatMap((row) => (row.items || []).map((item) => ({ ...item, row: item.row || row.id })))
    : zone.items || [];
}

function normalizeManifest(manifest) {
  const views = new Map((manifest.exploration?.views || []).map((view) => [view.id, {
    ...view,
    label: repairText(view.label),
    asset: normalizeAssetPath(view.asset),
    previewAsset: normalizeAssetPath(view.previewAsset)
  }]));
  const zones = (manifest.zones || []).map((zone) => ({
    id: zone.id,
    label: repairText(zone.label),
    viewId: zone.viewId || zoneItems(zone)[0]?.viewId || 'vue-generale',
    items: zoneItems(zone).map((item) => ({
      ...item,
      name: repairText(item.name),
      characteristics: repairText(item.characteristics),
      asset: normalizeAssetPath(item.asset),
      zoneId: zone.id,
      zoneLabel: repairText(zone.label)
    }))
  }));
  return {
    label: repairText(manifest.label) || 'Ampoulier d’urgence',
    readingRule: repairText(manifest.readingRule),
    closedAsset: normalizeAssetPath(manifest.closedAsset),
    views,
    zones,
    items: zones.flatMap((zone) => zone.items)
  };
}

function percent(value, total) {
  return `${((Number(value) / total) * 100).toFixed(4)}%`;
}

function itemLabel(item) {
  return [item.name, item.characteristics].filter(Boolean).join(' · ');
}

function hasTargetQuantity(item) {
  return item.quantityTarget !== null
    && item.quantityTarget !== undefined
    && Number.isFinite(Number(item.quantityTarget));
}

function stateTitle(state, manifest) {
  if (state.mode === 'overview') return 'Vue générale';
  if (state.zoneId === 'compartiment-gauche') return 'Compartiment gauche';
  if (state.zoneId === 'compartiment-droit') return 'Compartiment droit';
  if (state.zoneId === 'filet-central-gauche') return 'Filet central gauche';
  if (state.zoneId === 'filet-central-droit') return 'Filet central droit';
  return manifest.label;
}

function activeTab(state) {
  if (state.mode === 'overview') return 'vue-generale';
  if (state.zoneId === 'filet-central-gauche') return 'filet-gauche';
  if (state.zoneId === 'filet-central-droit') return 'filet-droit';
  return state.zoneId;
}

function tabState(tabId) {
  if (tabId === 'vue-generale') return { mode: 'overview', zoneId: '', itemId: '' };
  if (tabId === 'filet-gauche') return { mode: 'zoneFocus', zoneId: 'filet-central-gauche', itemId: '' };
  if (tabId === 'filet-droit') return { mode: 'zoneFocus', zoneId: 'filet-central-droit', itemId: '' };
  return { mode: 'zoneFocus', zoneId: tabId, itemId: '' };
}

export function emergencyAmpouleCaseTransition(state, action) {
  const current = state || { mode: 'closed', zoneId: '', itemId: '' };
  if (action.type === 'OPEN') return { mode: 'overview', zoneId: '', itemId: '' };
  if (action.type === 'CLOSE') return { mode: 'closed', zoneId: '', itemId: '' };
  if (action.type === 'FOCUS') return { mode: 'zoneFocus', zoneId: action.zoneId || '', itemId: '' };
  if (action.type === 'VIEW') return tabState(action.viewId);
  if (action.type === 'SELECT') {
    if (current.itemId === action.itemId) return { ...current, mode: 'zoneFocus', itemId: '' };
    return { ...current, mode: 'itemSelected', itemId: action.itemId || '' };
  }
  if (action.type === 'BACK') {
    if (current.itemId) return { ...current, mode: 'zoneFocus', itemId: '' };
    if (current.mode === 'zoneFocus') return { mode: 'overview', zoneId: '', itemId: '' };
    if (current.mode === 'overview') return { mode: 'closed', zoneId: '', itemId: '' };
  }
  return current;
}

function sceneConfig(state, manifest) {
  const isNet = state.zoneId === 'filet-central-gauche' || state.zoneId === 'filet-central-droit';
  const viewId = state.zoneId === 'filet-central-gauche'
    ? 'filet-gauche'
    : state.zoneId === 'filet-central-droit'
      ? 'filet-droit'
      : 'vue-generale';
  const view = manifest.views.get(viewId);
  const zones = state.mode === 'overview'
    ? manifest.zones.filter((zone) => zone.viewId === 'vue-generale')
    : manifest.zones.filter((zone) => zone.id === state.zoneId);
  return {
    view,
    zones,
    items: zones.flatMap((zone) => zone.items),
    size: isNet ? NET_SIZE : OVERVIEW_SIZE,
    isNet
  };
}

function renderClosed(manifest, hasError = false) {
  return `<div class="emergency-ampoule-case__intro">
    <div>
      <span class="emergency-ampoule-case__eyebrow">Sac rouge · Ampoulier</span>
      <h2>${escapeHtml(manifest?.label || 'Ampoulier d’urgence')}</h2>
      <p>Toucher l’ampoulier pour l’ouvrir et explorer chaque zone.</p>
    </div>
    <button type="button" class="emergency-ampoule-case__closed" data-ampoule-case-open ${hasError ? 'disabled' : ''} aria-label="Ouvrir l’ampoulier">
      <span class="emergency-ampoule-case__closed-visual">
        <img src="${ASSET_ROOT}/ampoulier-ferme-face.png" alt="Ampoulier jaune fermé, rangé dans le sac rouge" decoding="async">
        <i aria-hidden="true">${icon('expand', 18)}</i>
      </span>
      <strong>${hasError ? 'Contenu indisponible' : 'Toucher pour ouvrir'}</strong>
      <small>${hasError ? 'La vue fermée reste disponible.' : '40 éléments · 5 vues tactiles'}</small>
    </button>
  </div>`;
}

function renderTabs(state) {
  const selectedTab = activeTab(state);
  return `<nav class="emergency-ampoule-case__tabs" aria-label="Vues de l’ampoulier">
    ${VIEW_TABS.map((tab) => `<button type="button" class="${tab.id === selectedTab ? 'is-active' : ''}" data-ampoule-view="${tab.id}" aria-pressed="${tab.id === selectedTab}">${escapeHtml(tab.label)}</button>`).join('')}
  </nav>`;
}

function renderItem(item, state, size, isNet) {
  const position = isNet ? item.focusPosition : item.position;
  if (!position) return '';
  const selected = item.id === state.itemId;
  const dimmed = Boolean(state.itemId && !selected);
  const showAnchoredLabel = state.mode === 'zoneFocus' && !state.itemId;
  const style = [
    `--item-x:${percent(position.x, size.width)}`,
    `--item-y:${percent(position.y, size.height)}`,
    `--item-width:${percent(position.width, size.width)}`,
    `--item-height:${percent(position.height, size.height)}`,
    `--item-rotation:${Number(position.rotation) || 0}deg`,
    `--item-z:${Math.min(49, Math.max(10, Number(position.zIndex) || 20))}`
  ].join(';');
  return `<button type="button" class="emergency-ampoule-case__item${selected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}${showAnchoredLabel ? ' has-label' : ''}" style="${style}" data-ampoule-item="${escapeHtml(item.id)}" aria-pressed="${selected}" aria-label="${escapeHtml(itemLabel(item))}">
    <img src="${escapeHtml(item.asset)}" alt="" draggable="false" decoding="async">
    <span>${escapeHtml(item.name)}</span>
  </button>`;
}

function renderOverviewHotspots(showGuides) {
  const hotspots = [
    { id: 'compartiment-gauche', label: 'Gauche', className: 'left' },
    { id: 'compartiment-droit', label: 'Droite', className: 'right' },
    { id: 'filet-central-gauche', label: 'Filet gauche', className: 'net-left' },
    { id: 'filet-central-droit', label: 'Filet droit', className: 'net-right' }
  ];
  return `<div class="emergency-ampoule-case__hotspots${showGuides ? ' is-visible' : ''}">
    ${hotspots.map((hotspot) => `<button type="button" class="${hotspot.className}" data-ampoule-zone="${hotspot.id}" aria-label="Explorer ${hotspot.label}"><span>${escapeHtml(hotspot.label)}</span></button>`).join('')}
  </div>`;
}

function renderSelectedDetail(item) {
  if (!item) return '';
  return `<article class="emergency-ampoule-case__sheet" data-ampoule-sheet aria-live="polite">
    <i aria-hidden="true"></i>
    <img src="${escapeHtml(item.asset)}" alt="" decoding="async">
    <span>
      <small>${escapeHtml(item.zoneLabel)}</small>
      <strong>${escapeHtml(item.name)}</strong>
      ${item.characteristics ? `<em>${escapeHtml(item.characteristics)}</em>` : ''}
      ${hasTargetQuantity(item) ? `<b>Quantité cible : ${Number(item.quantityTarget)}</b>` : ''}
    </span>
    <button type="button" data-ampoule-item-clear aria-label="Fermer la fiche">${icon('close', 18)}</button>
  </article>`;
}

function renderScene(state, manifest, showGuides) {
  const config = sceneConfig(state, manifest);
  const selectedItem = config.items.find((item) => item.id === state.itemId) || null;
  const focusClass = state.zoneId === 'compartiment-gauche'
    ? ' is-focus-left'
    : state.zoneId === 'compartiment-droit'
      ? ' is-focus-right'
      : '';
  const netClass = config.isNet ? ' is-net' : '';
  return `<div class="emergency-ampoule-case__scene-shell${focusClass}${netClass}">
    <div class="emergency-ampoule-case__scene" style="--scene-ratio:${config.size.width}/${config.size.height}">
      <div class="emergency-ampoule-case__scene-inner">
        <img class="emergency-ampoule-case__base" src="${escapeHtml(config.view.asset)}" alt="${escapeHtml(stateTitle(state, manifest))}" decoding="async">
        ${config.items.map((item) => renderItem(item, state, config.size, config.isNet)).join('')}
      </div>
      ${state.mode === 'overview' ? renderOverviewHotspots(showGuides) : ''}
    </div>
    ${state.mode === 'overview' ? `<button type="button" class="emergency-ampoule-case__show-guides" data-ampoule-show-guides>${icon('activity', 15)} Afficher les repères</button>` : ''}
    ${renderSelectedDetail(selectedItem)}
  </div>`;
}

function renderOpen(state, manifest, showGuides) {
  const canGoBack = state.mode !== 'overview' || Boolean(state.itemId);
  return `<div class="emergency-ampoule-case__open-view" data-ampoule-state="${state.itemId ? 'itemSelected' : state.mode}">
    <header class="emergency-ampoule-case__toolbar">
      <button type="button" class="emergency-ampoule-case__back" data-ampoule-back ${canGoBack ? '' : 'disabled'} aria-label="Revenir à l’état précédent">${icon('chevron', 19)}</button>
      <span aria-live="polite"><small>Ampoulier</small><strong>${escapeHtml(stateTitle(state, manifest))}</strong></span>
      <button type="button" class="emergency-ampoule-case__close" data-ampoule-case-close aria-label="Fermer l’ampoulier">${icon('close', 19)}</button>
    </header>
    ${renderTabs(state)}
    ${renderScene(state, manifest, showGuides)}
  </div>`;
}

export function mountEmergencyAmpouleCase(root) {
  if (!root) return () => {};
  let disposed = false;
  let manifest = null;
  let state = { mode: 'closed', zoneId: '', itemId: '' };
  let showGuides = true;
  let guideTimer = 0;
  let sheetTouchStartY = null;

  const clearGuideTimer = () => {
    if (guideTimer) window.clearTimeout(guideTimer);
    guideTimer = 0;
  };

  const scheduleGuideFade = () => {
    clearGuideTimer();
    guideTimer = window.setTimeout(() => {
      showGuides = false;
      render();
    }, GUIDE_DURATION_MS);
  };

  const render = () => {
    if (disposed) return;
    root.innerHTML = state.mode === 'closed' || !manifest
      ? renderClosed(manifest)
      : renderOpen(state, manifest, showGuides);
  };

  const enterOverview = () => {
    state = emergencyAmpouleCaseTransition(state, { type: 'OPEN' });
    showGuides = true;
    render();
    scheduleGuideFade();
  };

  const focusZone = (zoneId) => {
    clearGuideTimer();
    state = emergencyAmpouleCaseTransition(state, { type: 'FOCUS', zoneId });
    showGuides = false;
    render();
  };

  const clearSelection = () => {
    if (!state.itemId) return;
    state = emergencyAmpouleCaseTransition(state, { type: 'BACK' });
    render();
  };

  const goBack = () => {
    const previousMode = state.mode;
    state = emergencyAmpouleCaseTransition(state, { type: 'BACK' });
    if (state.mode === 'overview' && previousMode !== 'overview') {
      showGuides = true;
      render();
      scheduleGuideFade();
      return;
    }
    if (state.mode === 'closed') {
      clearGuideTimer();
    }
    render();
  };

  const ready = fetch(MANIFEST_PATH)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      manifest = normalizeManifest(data);
      render();
      return manifest;
    })
    .catch((error) => {
      console.warn('Ampoulier interactif indisponible', error);
      if (!disposed) root.innerHTML = renderClosed(null, true);
      return null;
    });

  const onClick = async (event) => {
    if (event.target.closest('[data-ampoule-case-open]')) {
      const loaded = manifest || await ready;
      if (!loaded || disposed) return;
      enterOverview();
      root.querySelector('[data-ampoule-case-close]')?.focus({ preventScroll: true });
      return;
    }

    if (event.target.closest('[data-ampoule-case-close]')) {
      clearGuideTimer();
      state = emergencyAmpouleCaseTransition(state, { type: 'CLOSE' });
      render();
      root.querySelector('[data-ampoule-case-open]')?.focus({ preventScroll: true });
      return;
    }

    if (event.target.closest('[data-ampoule-back]')) {
      goBack();
      return;
    }

    if (event.target.closest('[data-ampoule-item-clear]')) {
      clearSelection();
      return;
    }

    if (event.target.closest('[data-ampoule-show-guides]')) {
      showGuides = true;
      render();
      scheduleGuideFade();
      return;
    }

    const viewButton = event.target.closest('[data-ampoule-view]');
    if (viewButton) {
      const next = emergencyAmpouleCaseTransition(state, { type: 'VIEW', viewId: viewButton.dataset.ampouleView });
      if (next.mode === 'overview') enterOverview();
      else focusZone(next.zoneId);
      return;
    }

    const zoneButton = event.target.closest('[data-ampoule-zone]');
    if (zoneButton) {
      focusZone(zoneButton.dataset.ampouleZone);
      return;
    }

    const itemButton = event.target.closest('[data-ampoule-item]');
    if (itemButton && manifest) {
      const nextId = itemButton.dataset.ampouleItem;
      if (state.itemId === nextId) {
        clearSelection();
        return;
      }
      state = emergencyAmpouleCaseTransition(state, { type: 'SELECT', itemId: nextId });
      if ('vibrate' in navigator) navigator.vibrate(8);
      render();
    }
  };

  const onKeyDown = (event) => {
    if (event.key !== 'Escape' || state.mode === 'closed') return;
    event.preventDefault();
    goBack();
  };

  const onTouchStart = (event) => {
    if (!event.target.closest('[data-ampoule-sheet]')) return;
    sheetTouchStartY = event.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (event) => {
    if (sheetTouchStartY === null) return;
    const endY = event.changedTouches[0]?.clientY ?? sheetTouchStartY;
    if (endY - sheetTouchStartY > 48) clearSelection();
    sheetTouchStartY = null;
  };

  root.addEventListener('click', onClick);
  root.addEventListener('touchstart', onTouchStart, { passive: true });
  root.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('keydown', onKeyDown);

  return () => {
    disposed = true;
    clearGuideTimer();
    root.removeEventListener('click', onClick);
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('keydown', onKeyDown);
  };
}
