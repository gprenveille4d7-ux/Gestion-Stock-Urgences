import { escapeHtml, icon } from '../../ui/utils.js';

const ASSET_ROOT = './assets/sacs/sac-rouge/ampoulier';
const MANIFEST_PATH = `${ASSET_ROOT}/ampoulier-inventaire-confirme.json`;
const CANVAS_SIZE = 1536;
const AMPOULE_SECTION_IDS = new Set(['ampoulier-gauche', 'ampoulier-droit', 'ampoulier-interne']);

const TEXT_REPAIRS = new Map([
  ['â€™', '’'],
  ['Ã€', 'À'],
  ['Ã‰', 'É'],
  ['Ã©', 'é'],
  ['Ã¨', 'è'],
  ['Ãª', 'ê'],
  ['Ã«', 'ë'],
  ['Ã®', 'î'],
  ['Ã¯', 'ï'],
  ['Ã´', 'ô'],
  ['Ã¹', 'ù'],
  ['Ã»', 'û'],
  ['Ã§', 'ç']
]);

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

function normalizeManifest(manifest) {
  const zones = (manifest.zones || []).map((zone) => {
    const sourceItems = zone.rows
      ? zone.rows.flatMap((row) => (row.items || []).map((item) => ({ ...item, row: item.row || row.id })))
      : zone.items || [];
    return {
      id: zone.id,
      label: repairText(zone.label),
      items: sourceItems.map((item) => ({
        ...item,
        name: repairText(item.name),
        characteristics: repairText(item.characteristics),
        asset: normalizeAssetPath(item.asset),
        zoneId: zone.id,
        zoneLabel: repairText(zone.label)
      }))
    };
  });
  return {
    label: repairText(manifest.label) || 'Ampoulier d’urgence',
    readingRule: repairText(manifest.readingRule),
    closedAsset: `${ASSET_ROOT}/ampoulier-ferme-face.png`,
    openAsset: `${ASSET_ROOT}/ampoulier-ouvert-vide-gabarit.png`,
    previewAsset: `${ASSET_ROOT}/ampoulier-ouvert-compose.png`,
    zones,
    items: zones.flatMap((zone) => zone.items)
  };
}

function percent(value) {
  return `${((Number(value) / CANVAS_SIZE) * 100).toFixed(4)}%`;
}

function itemLabel(item) {
  return [item.name, item.characteristics].filter(Boolean).join(' · ');
}

function renderClosed(manifest, hasError = false) {
  return `<div class="emergency-ampoule-case__intro">
    <div>
      <span class="emergency-ampoule-case__eyebrow">Sac rouge · Ampoulier</span>
      <h2>${escapeHtml(manifest?.label || 'Ampoulier d’urgence')}</h2>
      <p>Toucher l’ampoulier pour l’ouvrir et repérer son contenu.</p>
    </div>
    <button type="button" class="emergency-ampoule-case__closed" data-ampoule-case-open ${hasError ? 'disabled' : ''} aria-label="Ouvrir l’ampoulier">
      <span class="emergency-ampoule-case__closed-visual">
        <img src="${ASSET_ROOT}/ampoulier-ferme-face.png" alt="Ampoulier jaune fermé, rangé dans le sac rouge" decoding="async">
        <i aria-hidden="true">${icon('expand', 18)}</i>
      </span>
      <strong>${hasError ? 'Contenu indisponible' : 'Toucher pour ouvrir'}</strong>
      <small>${hasError ? 'La vue fermée reste disponible.' : '40 éléments · vue interactive'}</small>
    </button>
  </div>`;
}

function renderItem(item, selectedId) {
  const position = item.position || {};
  const selected = item.id === selectedId;
  const dimmed = Boolean(selectedId && !selected);
  const style = [
    `--item-x:${percent(position.x)}`,
    `--item-y:${percent(position.y)}`,
    `--item-width:${percent(position.width)}`,
    `--item-height:${percent(position.height)}`,
    `--item-rotation:${Number(position.rotation) || 0}deg`,
    `--item-z:${Number(position.zIndex) || 20}`
  ].join(';');
  return `<button type="button" class="emergency-ampoule-case__item${selected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}" style="${style}" data-ampoule-item="${escapeHtml(item.id)}" aria-pressed="${selected}" aria-label="${escapeHtml(itemLabel(item))}">
    <img src="${escapeHtml(item.asset)}" alt="" draggable="false" decoding="async">
  </button>`;
}

function renderSelectedDetail(item) {
  if (!item) {
    return `<div class="emergency-ampoule-case__detail emergency-ampoule-case__detail--empty" aria-live="polite">
      ${icon('activity', 20)}
      <span><strong>Sélectionner un élément</strong><small>Toucher une ampoule, un flacon ou un dispositif pour l’agrandir.</small></span>
    </div>`;
  }
  return `<article class="emergency-ampoule-case__detail is-active" aria-live="polite">
    <img src="${escapeHtml(item.asset)}" alt="" decoding="async">
    <span>
      <small>${escapeHtml(item.zoneLabel)}</small>
      <strong>${escapeHtml(item.name)}</strong>
      ${item.characteristics ? `<em>${escapeHtml(item.characteristics)}</em>` : ''}
      ${Number.isFinite(Number(item.quantityTarget)) ? `<b>Quantité cible : ${Number(item.quantityTarget)}</b>` : ''}
    </span>
    <button type="button" data-ampoule-item-clear aria-label="Réduire l’élément sélectionné">${icon('close', 18)}</button>
  </article>`;
}

function renderZoneIndex(manifest, selectedId) {
  return `<div class="emergency-ampoule-case__zones" aria-label="Liste des éléments de l’ampoulier">
    ${manifest.zones.map((zone, index) => `<details${index === 0 ? ' open' : ''}>
      <summary><span>${escapeHtml(zone.label)}</span><b>${zone.items.length}</b></summary>
      <div>
        ${zone.items.map((item) => `<button type="button" class="${item.id === selectedId ? 'is-selected' : ''}" data-ampoule-item="${escapeHtml(item.id)}" aria-pressed="${item.id === selectedId}">
          <img src="${escapeHtml(item.asset)}" alt="" loading="lazy" decoding="async">
          <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.characteristics || zone.label)}${Number.isFinite(Number(item.quantityTarget)) ? ` · cible ${Number(item.quantityTarget)}` : ''}</small></span>
        </button>`).join('')}
      </div>
    </details>`).join('')}
  </div>`;
}

function renderOpen(manifest, selectedId) {
  const selectedItem = manifest.items.find((item) => item.id === selectedId) || null;
  return `<div class="emergency-ampoule-case__open-view">
    <header class="emergency-ampoule-case__toolbar">
      <span><small>Sac rouge</small><strong>${escapeHtml(manifest.label)}</strong></span>
      <button type="button" data-ampoule-case-close>${icon('close', 18)} Fermer</button>
    </header>
    <p class="emergency-ampoule-case__guide">${escapeHtml(manifest.readingRule || 'Rangées du haut vers le bas, puis de gauche à droite.')}</p>
    <div class="emergency-ampoule-case__canvas-shell">
      <div class="emergency-ampoule-case__canvas" data-ampoule-case-canvas>
        <img class="emergency-ampoule-case__base" src="${escapeHtml(manifest.openAsset)}" alt="Ampoulier d’urgence ouvert vu de dessus" decoding="async">
        ${manifest.items.map((item) => renderItem(item, selectedId)).join('')}
      </div>
      <span class="emergency-ampoule-case__tap-guide" aria-hidden="true">Touchez un élément</span>
    </div>
    ${renderSelectedDetail(selectedItem)}
    ${renderZoneIndex(manifest, selectedId)}
  </div>`;
}

export function mountEmergencyAmpouleCase(root) {
  if (!root) return () => {};
  let disposed = false;
  let manifest = null;
  let isOpen = false;
  let selectedId = '';

  const render = () => {
    if (disposed) return;
    root.innerHTML = isOpen && manifest ? renderOpen(manifest, selectedId) : renderClosed(manifest);
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
    const openButton = event.target.closest('[data-ampoule-case-open]');
    if (openButton) {
      const loaded = manifest || await ready;
      if (!loaded || disposed) return;
      isOpen = true;
      selectedId = '';
      render();
      root.querySelector('[data-ampoule-case-close]')?.focus({ preventScroll: true });
      return;
    }

    if (event.target.closest('[data-ampoule-case-close]')) {
      isOpen = false;
      selectedId = '';
      render();
      root.querySelector('[data-ampoule-case-open]')?.focus({ preventScroll: true });
      return;
    }

    if (event.target.closest('[data-ampoule-item-clear]')) {
      selectedId = '';
      render();
      return;
    }

    const itemButton = event.target.closest('[data-ampoule-item]');
    if (itemButton && manifest) {
      const nextId = itemButton.dataset.ampouleItem;
      selectedId = selectedId === nextId ? '' : nextId;
      render();
      if (selectedId) {
        root.querySelector('.emergency-ampoule-case__detail.is-active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const onKeyDown = (event) => {
    if (event.key !== 'Escape' || !isOpen) return;
    event.preventDefault();
    if (selectedId) {
      selectedId = '';
      render();
      return;
    }
    isOpen = false;
    render();
    root.querySelector('[data-ampoule-case-open]')?.focus({ preventScroll: true });
  };

  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);

  return () => {
    disposed = true;
    root.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeyDown);
  };
}
