import { escapeHtml, icon, normalizeSearch } from '../../ui/utils.js';

const DATA_URL = './assets/chariot-urgences/reserve-01-kits/reserve-01-kits-inventaire.json';
const ASSET_BASE = './assets/chariot-urgences/';
const FILTERS = ['all', 'expired'];
const SNAPS = ['preview', 'half', 'full'];

function assetUrl(path) {
  if (!path) return '';
  return `${ASSET_BASE}${String(path).replace(/^\.\//, '')}`;
}

function usableAlert(value) {
  const alert = String(value || '').trim();
  if (!alert || alert.startsWith('#') || /^\*+$/.test(alert)) return '';
  return alert;
}

function itemState(item) {
  const alert = usableAlert(item.alert);
  return {
    alert,
    expired: /p[ée]rim[ée]/i.test(alert)
  };
}

function kitState(kit) {
  const expired = kit.items.filter((item) => itemState(item).expired).length;
  return {
    expired,
    label: expired
      ? `${expired} ligne${expired > 1 ? 's' : ''} périmée${expired > 1 ? 's' : ''}`
      : 'Aucune alerte exploitable'
  };
}

function renderImage(path, alt, className = '') {
  return `<span class="reserve01-media ${className}">
    <img src="${escapeHtml(assetUrl(path))}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">
    <span class="reserve01-media-error" hidden>${icon('alert', 18)}<small>Visuel indisponible</small></span>
  </span>`;
}

function renderHotspots(data, selectedKitId, query) {
  return data.kits.map((kit, index) => {
    const hotspot = kit.roomHotspot || {};
    const hiddenBySearch = query && !normalizeSearch(kit.name).includes(query);
    const selected = kit.id === selectedKitId;
    return `<button type="button"
      class="reserve01-hotspot${selected ? ' is-selected' : ''}${hiddenBySearch ? ' is-filtered' : ''}"
      style="--hotspot-x:${Number(hotspot.xPercent) || 0}%;--hotspot-y:${Number(hotspot.yPercent) || 0}%;--hotspot-w:${Number(hotspot.widthPercent) || 10}%;--hotspot-h:${Number(hotspot.heightPercent) || 8}%"
      data-nav="reserve/reserve-01-kits/${escapeHtml(kit.id)}"
      aria-label="Ouvrir la caisse ${escapeHtml(kit.name)}, ${kit.items.length} lignes">
      <span>${index + 1}</span>
      <small>${escapeHtml(kit.name)}</small>
    </button>`;
  }).join('');
}

function renderRoom(data, selectedKitId, query) {
  return `<figure class="reserve01-room${selectedKitId ? ' has-sheet' : ''}" aria-label="Étagère de la Réserve 1 avec dix caisses sélectionnables">
    <div class="reserve01-room-stage">
      <img src="${escapeHtml(assetUrl(data.roomPreviewAsset || data.roomAsset))}" alt="Vue depuis l’entrée de la Réserve 1, étagère à droite" decoding="async">
      <div class="reserve01-room-error" hidden>${icon('alert', 22)}<strong>La vue de la réserve n’a pas pu être chargée.</strong></div>
      <div class="reserve01-hotspots">${renderHotspots(data, selectedKitId, query)}</div>
    </div>
    <figcaption><span>${icon('map', 15)} Étagère à droite en entrant</span><span>Position des caisses · À valider sur place</span></figcaption>
  </figure>`;
}

function renderItemCard(kit, item) {
  const state = itemState(item);
  return `<button type="button" class="reserve01-item-card${state.expired ? ' is-expired' : ''}" data-nav="reserve/reserve-01-kits/${escapeHtml(kit.id)}/${escapeHtml(item.id)}" aria-label="Voir ${escapeHtml(item.name)}">
    ${renderImage(item.asset, item.name, 'reserve01-item-thumb')}
    <span class="reserve01-item-copy">
      <strong>${escapeHtml(item.name)}</strong>
      <small>${item.reference ? `Réf. ${escapeHtml(item.reference)}` : 'Référence non renseignée'} · ${escapeHtml(item.quantity === '' || item.quantity == null ? 'Qté non renseignée' : `${item.quantity} ${item.unit || 'unité'}`)}</small>
    </span>
    ${state.expired ? '<span class="reserve01-alert-badge">Périmé</span>' : icon('chevron', 16)}
  </button>`;
}

function renderItemDetail(kit, item) {
  if (!item) return '';
  const state = itemState(item);
  const rows = [
    ['Désignation', item.name || 'Non renseignée'],
    ['Référence', item.reference || 'Non renseignée'],
    ['Quantité', item.quantity === '' || item.quantity == null ? 'Non renseignée' : `${item.quantity} ${item.unit || 'unité'}`],
    ['Péremption', item.expiry || 'Non renseignée'],
    ['État d’alerte', state.alert || 'Aucune alerte exploitable'],
    ['Cellule source', `${kit.sourceSheet || 'Feuille inconnue'} · ${item.sourceCell || 'cellule inconnue'}`]
  ];
  return `<article class="reserve01-item-focus" role="dialog" aria-modal="true" aria-labelledby="reserve01-item-title">
    <div class="reserve01-item-focus-head">
      <button type="button" class="reserve01-round-button" data-nav="reserve/reserve-01-kits/${escapeHtml(kit.id)}" aria-label="Fermer la fiche">${icon('close', 20)}</button>
      <span>Fiche matériel</span>
    </div>
    ${renderImage(item.asset, item.name, 'reserve01-item-focus-media')}
    <div class="reserve01-item-focus-copy">
      <p>${escapeHtml(kit.name)}</p>
      <h2 id="reserve01-item-title">${escapeHtml(item.name)}</h2>
      ${state.expired ? `<span class="reserve01-focus-alert">${icon('alert', 15)} ${escapeHtml(state.alert)}</span>` : ''}
      <dl>${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
    </div>
  </article>`;
}

function renderSheet(data, kit, selectedItem, state) {
  const globalState = kitState(kit);
  const query = normalizeSearch(state.search);
  const visibleItems = kit.items.filter((item) => {
    if (state.filter === 'expired' && !itemState(item).expired) return false;
    return !query || normalizeSearch(`${item.name} ${item.reference || ''} ${item.sourceCell || ''}`).includes(query);
  });
  const snapIndex = SNAPS.indexOf(state.snap);
  const nextSnap = SNAPS[(snapIndex + 1) % SNAPS.length];
  return `<section class="reserve01-sheet" data-snap="${escapeHtml(state.snap)}" aria-label="Inventaire de ${escapeHtml(kit.name)}">
    <button type="button" class="reserve01-sheet-handle" data-reserve-snap="${nextSnap}" aria-label="Changer la hauteur de la fiche"><span></span></button>
    <div class="reserve01-sheet-summary">
      ${renderImage(kit.asset, kit.name, 'reserve01-kit-asset')}
      <div><p>Réserve 1 · caisse ${escapeHtml(String(kit.suggestedShelfPosition?.levelFromTop || ''))}</p><h1>${escapeHtml(kit.name)}</h1><span>${kit.items.length} lignes · ${escapeHtml(globalState.label)}</span></div>
      <button type="button" class="reserve01-round-button" data-nav="reserve/reserve-01-kits" aria-label="Fermer la caisse">${icon('close', 19)}</button>
    </div>
    <div class="reserve01-sheet-tools">
      <label>${icon('search', 17)}<span class="sr-only">Rechercher dans cette caisse</span><input type="search" data-reserve-item-search value="${escapeHtml(state.search)}" placeholder="Rechercher dans la caisse…" autocomplete="off"></label>
      <div class="reserve01-filters" role="group" aria-label="Filtrer les articles">
        <button type="button" class="${state.filter === 'all' ? 'active' : ''}" data-reserve-filter="all">Tous <b>${kit.items.length}</b></button>
        ${globalState.expired ? `<button type="button" class="${state.filter === 'expired' ? 'active' : ''}" data-reserve-filter="expired">Périmés <b>${globalState.expired}</b></button>` : ''}
      </div>
    </div>
    <div class="reserve01-item-list" aria-live="polite">
      ${visibleItems.map((item) => renderItemCard(kit, item)).join('') || '<div class="reserve01-empty"><strong>Aucun matériel trouvé</strong><span>Modifiez la recherche ou le filtre.</span></div>'}
    </div>
    ${renderItemDetail(kit, selectedItem)}
  </section>`;
}

function renderModule(root, data, state) {
  const selectedKit = data.kits.find((kit) => kit.id === state.kitId);
  const selectedItem = selectedKit?.items.find((item) => item.id === state.itemId);
  const moduleState = selectedItem ? 'itemSelected' : selectedKit ? 'kitFocused' : 'reserveOverview';
  const backRoute = selectedItem
    ? `reserve/reserve-01-kits/${selectedKit.id}`
    : selectedKit
      ? 'reserve/reserve-01-kits'
      : 'reserve/reserve-1';
  root.innerHTML = `<section class="reserve01-app" data-reserve-state="${moduleState}">
    <header class="reserve01-toolbar">
      <button type="button" class="reserve01-round-button" data-nav="${escapeHtml(backRoute)}" aria-label="Retour">${icon('back', 21)}</button>
      <div><small>Les Réserves</small><h1 class="page-title" tabindex="-1">Réserve 1 · Kits d’urgence</h1></div>
      <button type="button" class="reserve01-round-button" data-reserve-room-search aria-label="Rechercher une caisse">${icon('search', 19)}</button>
    </header>
    <div class="reserve01-room-search" ${state.roomSearchOpen ? '' : 'hidden'}>
      <label>${icon('search', 17)}<span class="sr-only">Rechercher une caisse</span><input type="search" data-reserve-room-search-input value="${escapeHtml(state.roomSearch)}" placeholder="Nom d’une caisse…" autocomplete="off"></label>
      <button type="button" data-reserve-room-search-close>Fermer</button>
    </div>
    <div class="reserve01-location"><span>${icon('map', 15)} Réserve 1</span><strong>Étagère à droite en entrant</strong><em>À valider sur place</em></div>
    ${renderRoom(data, selectedKit?.id || '', normalizeSearch(state.roomSearch))}
    ${selectedKit ? renderSheet(data, selectedKit, selectedItem, state) : `<div class="reserve01-overview-copy"><strong>Choisissez directement une caisse</strong><span>10 caisses distinctes · 323 lignes de matériel</span></div>`}
  </section>`;
  root.querySelector('.reserve01-toolbar .page-title')?.focus({ preventScroll: true });
}

export function renderReserve01KitsHost(kitId = '', itemId = '') {
  return `<div class="reserve01-host" data-reserve01-root data-kit-id="${escapeHtml(kitId)}" data-item-id="${escapeHtml(itemId)}">
    <div class="reserve01-loading" role="status"><span></span><strong>Ouverture de la Réserve 1…</strong></div>
  </div>`;
}

export function mountReserve01Kits(root) {
  if (!root) return () => {};
  const state = {
    kitId: root.dataset.kitId || '',
    itemId: root.dataset.itemId || '',
    search: '',
    filter: 'all',
    snap: root.dataset.itemId ? 'full' : 'half',
    roomSearch: '',
    roomSearchOpen: false
  };
  let data = null;
  let disposed = false;

  const rerender = () => {
    if (!disposed && data) renderModule(root, data, state);
  };

  const onClick = (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.reserveSnap) {
      state.snap = SNAPS.includes(target.dataset.reserveSnap) ? target.dataset.reserveSnap : 'half';
      rerender();
    } else if (target.dataset.reserveFilter) {
      state.filter = FILTERS.includes(target.dataset.reserveFilter) ? target.dataset.reserveFilter : 'all';
      rerender();
    } else if (target.dataset.reserveRoomSearch !== undefined) {
      state.roomSearchOpen = true;
      rerender();
      root.querySelector('[data-reserve-room-search-input]')?.focus();
    } else if (target.dataset.reserveRoomSearchClose !== undefined) {
      state.roomSearchOpen = false;
      state.roomSearch = '';
      rerender();
    }
  };

  const onInput = (event) => {
    if (event.target.matches('[data-reserve-item-search]')) {
      state.search = event.target.value;
      const position = event.target.selectionStart;
      rerender();
      const input = root.querySelector('[data-reserve-item-search]');
      input?.focus();
      input?.setSelectionRange(position, position);
    } else if (event.target.matches('[data-reserve-room-search-input]')) {
      state.roomSearch = event.target.value;
      const position = event.target.selectionStart;
      rerender();
      const input = root.querySelector('[data-reserve-room-search-input]');
      input?.focus();
      input?.setSelectionRange(position, position);
    }
  };

  const onError = (event) => {
    const image = event.target.closest?.('img');
    if (!image || !root.contains(image)) return;
    image.hidden = true;
    image.closest('.reserve01-media')?.querySelector('.reserve01-media-error')?.removeAttribute('hidden');
    if (image.closest('.reserve01-room-stage')) {
      image.closest('.reserve01-room-stage')?.querySelector('.reserve01-room-error')?.removeAttribute('hidden');
    }
  };

  const onKeydown = (event) => {
    if (event.key !== 'Escape') return;
    const route = state.itemId
      ? `reserve/reserve-01-kits/${state.kitId}`
      : state.kitId
      ? 'reserve/reserve-01-kits'
      : 'reserve/reserve-1';
    location.hash = `#/${route}`;
  };

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('error', onError, true);
  window.addEventListener('keydown', onKeydown);

  fetch(DATA_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      if (disposed) return;
      if (!Array.isArray(payload.kits) || payload.kits.length !== 10) throw new Error('Inventaire Réserve 1 incomplet');
      data = payload;
      rerender();
    })
    .catch((error) => {
      if (disposed) return;
      console.error('Réserve 1 indisponible', error);
      root.innerHTML = `<div class="reserve01-fatal" role="alert">${icon('alert', 24)}<h1>Réserve 1 indisponible</h1><p>Les données ou les visuels n’ont pas pu être chargés. Réessayez après une reconnexion.</p><button type="button" class="primary-button" data-nav="reserve/reserve-1">Revenir à la Réserve 1</button></div>`;
    });

  return () => {
    disposed = true;
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
    root.removeEventListener('error', onError, true);
    window.removeEventListener('keydown', onKeydown);
  };
}
