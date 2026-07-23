import { escapeHtml } from '../../ui/utils.js';
import { emergencyCarts } from './emergency-cart-data.js';

export function renderEmergencyCartsHost() {
  return '<div class="emergency-carts-integration" data-emergency-carts-root></div>';
}

function boxChoice() {
  return `<section class="ecm-box-grid" aria-label="Choisir le box">
    ${[3, 4].map((box) => `<button class="ecm-box-card" type="button" data-ecm-action="choose-box" data-ecm-box="${box}">
      <span class="ecm-box-number">${box}</span>
      <span><strong>Box ${box} adulte</strong><small>Ouvrir le chariot d’urgences</small></span>
      <span aria-hidden="true">›</span>
    </button>`).join('')}
  </section>`;
}

function cartFront(cart, notice) {
  return `<section class="ecm-stage">
    <p class="ecm-instruction">Les cinq tiroirs sont repérés sur le chariot. Le tiroir 1 possède déjà sa vue interactive.</p>
    <div class="ecm-cart-canvas">
      <img src="${escapeHtml(cart.frontAsset)}" alt="${escapeHtml(cart.label)}">
      ${cart.drawers.map((drawer, index) => `<button type="button" class="ecm-drawer-hitbox ${drawer.available ? 'is-available' : 'is-pending'}" data-ecm-action="open-drawer" data-ecm-drawer="${escapeHtml(drawer.id)}" style="left:${drawer.hitArea.x}%;top:${drawer.hitArea.y}%;width:${drawer.hitArea.width}%;height:${drawer.hitArea.height}%" aria-label="${escapeHtml(drawer.available ? `Ouvrir ${drawer.label}` : `${drawer.label}, contenu non encore documenté`)}"><b aria-hidden="true">${index + 1}</b><span>${escapeHtml(drawer.label)}</span></button>`).join('')}
    </div>
    <div class="ecm-drawer-list" aria-label="Accès direct aux tiroirs">
      ${cart.drawers.map((drawer, index) => `<button type="button" class="${drawer.available ? 'is-available' : 'is-pending'}" data-ecm-action="open-drawer" data-ecm-drawer="${escapeHtml(drawer.id)}">
        ${drawer.previewAsset ? `<img class="ecm-drawer-preview" src="${escapeHtml(drawer.previewAsset)}" alt="">` : `<span class="ecm-drawer-number" aria-hidden="true">${index + 1}</span>`}
        <span><strong>${escapeHtml(drawer.label)}</strong><small>${escapeHtml(drawer.available ? drawer.category : 'Photo et inventaire à ajouter')}</small></span>
        <span aria-hidden="true">${drawer.available ? '›' : '…'}</span>
      </button>`).join('')}
    </div>
    ${notice ? `<p class="ecm-notice" role="status">${escapeHtml(notice)}</p>` : ''}
  </section>`;
}

function itemDetail(item) {
  return `<aside class="ecm-detail" aria-live="polite">
    <div><p>${escapeHtml(item.category)}</p><h2>${escapeHtml(item.name)}</h2>${item.specification ? `<strong>${escapeHtml(item.specification)}</strong>` : ''}</div>
    <button type="button" data-ecm-action="close-item" aria-label="Fermer la fiche">×</button>
    <dl>
      <div><dt>Emplacement</dt><dd>${escapeHtml(item.location)}</dd></div>
      ${item.quantityTarget === undefined ? '' : `<div><dt>Quantité cible</dt><dd>${Number(item.quantityTarget)} ${escapeHtml(item.unit || '')}</dd></div>`}
      ${item.expiryTracked === undefined ? '' : `<div><dt>Péremption suivie</dt><dd>${item.expiryTracked ? 'Oui' : 'Non'}</dd></div>`}
      ${item.note ? `<div><dt>Remarque</dt><dd>${escapeHtml(item.note)}</dd></div>` : ''}
    </dl>
  </aside>`;
}

function drawerView(drawer, selectedItem) {
  const positionedItems = drawer.items.filter((item) => item.asset && item.position);
  const awaitingAssets = drawer.items.filter((item) => !item.asset || !item.position);
  return `<section class="ecm-stage">
    <p class="ecm-instruction">Touchez un matériel pour afficher sa fiche. Les repères sous le tiroir restent utilisables tant que les détourages définitifs ne sont pas ajoutés.</p>
    <div class="ecm-drawer-canvas ${selectedItem ? 'has-selection' : ''}">
      <img class="ecm-drawer-background" src="${escapeHtml(drawer.topAsset)}" alt="Tiroir 1 ouvert, sans compartiment">
      ${positionedItems.map((item) => {
        const selected = selectedItem?.id === item.id;
        return `<button type="button" class="ecm-visual-item ${selected ? 'is-selected' : ''}" data-ecm-action="select-item" data-ecm-item="${escapeHtml(item.id)}" aria-label="${escapeHtml(`Afficher ${item.name}${item.specification ? `, ${item.specification}` : ''}`)}" aria-pressed="${selected}" style="left:${item.position.x}%;top:${item.position.y}%;width:${item.position.width}%;height:${item.position.height}%;z-index:${selected ? 100 : item.position.zIndex || 1};--item-rotation:${item.position.rotation || 0}deg"><img src="${escapeHtml(item.asset)}" alt=""></button>`;
      }).join('')}
    </div>
    <div class="ecm-inventory">
      <div class="ecm-inventory-heading"><h2>Matériel du tiroir</h2><span>${drawer.items.length}</span></div>
      <div class="ecm-item-grid">
        ${drawer.items.map((item) => {
          const selected = selectedItem?.id === item.id;
          return `<button type="button" class="${selected ? 'is-selected' : ''}" data-ecm-action="select-item" data-ecm-item="${escapeHtml(item.id)}" aria-pressed="${selected}"><strong>${escapeHtml(item.name)}</strong>${item.specification ? `<small>${escapeHtml(item.specification)}</small>` : ''}</button>`;
        }).join('')}
      </div>
      ${awaitingAssets.length ? `<p class="ecm-assets-note">${awaitingAssets.length} détourages restent à ajouter. Les fiches sont déjà fonctionnelles.</p>` : ''}
    </div>
    ${selectedItem ? itemDetail(selectedItem) : ''}
  </section>`;
}

export function mountEmergencyCartsModule(root, { initialBox = null, onExit = null } = {}) {
  if (!root) return () => {};
  const state = {
    view: initialBox ? 'cart-front' : 'box-choice',
    box: initialBox || 3,
    drawerId: '',
    selectedItemId: '',
    notice: ''
  };

  function currentDrawer() {
    return emergencyCarts[state.box].drawers.find((drawer) => drawer.id === state.drawerId) || null;
  }

  function render(focusSelector = '') {
    const cart = emergencyCarts[state.box];
    const drawer = currentDrawer();
    const selectedItem = drawer?.items.find((item) => item.id === state.selectedItemId) || null;
    const title = state.view === 'box-choice' ? 'Chariots adultes' : state.view === 'drawer' && drawer ? drawer.label : cart.label;
    root.innerHTML = `<section class="ecm-shell">
      <header class="ecm-header">
        <button class="ecm-back" type="button" data-ecm-action="back"><span aria-hidden="true">←</span>Retour</button>
        <div><p class="ecm-eyebrow">Gestion stock urgences</p><h1>${escapeHtml(title)}</h1>${state.view === 'drawer' && drawer ? `<p class="ecm-subtitle">Box ${state.box} · ${drawer.items.length} matériels référencés</p>` : ''}</div>
      </header>
      ${state.view === 'box-choice' ? boxChoice() : state.view === 'cart-front' ? cartFront(cart, state.notice) : drawer ? drawerView(drawer, selectedItem) : ''}
    </section>`;
    if (focusSelector) window.requestAnimationFrame(() => root.querySelector(focusSelector)?.focus({ preventScroll: true }));
  }

  function goBack() {
    state.notice = '';
    state.selectedItemId = '';
    if (state.view === 'drawer') {
      state.drawerId = '';
      state.view = 'cart-front';
      render('[data-ecm-action="open-drawer"]');
    } else if (state.view === 'cart-front') {
      state.view = 'box-choice';
      render(`[data-ecm-box="${state.box}"]`);
    } else {
      onExit?.();
    }
  }

  function onClick(event) {
    const button = event.target.closest('[data-ecm-action]');
    if (!button || !root.contains(button)) return;
    const action = button.dataset.ecmAction;
    if (action === 'back') return goBack();
    if (action === 'choose-box') {
      state.box = Number(button.dataset.ecmBox) === 4 ? 4 : 3;
      state.view = 'cart-front';
      state.drawerId = '';
      state.selectedItemId = '';
      state.notice = '';
      render('[data-ecm-action="open-drawer"]');
      return;
    }
    if (action === 'open-drawer') {
      const drawer = emergencyCarts[state.box].drawers.find((entry) => entry.id === button.dataset.ecmDrawer);
      if (!drawer?.available || !drawer.topAsset) {
        state.notice = `${drawer?.label || 'Ce tiroir'} : ajoutez d’abord sa photo vue de dessus et son inventaire.`;
        render(`[data-ecm-drawer="${button.dataset.ecmDrawer}"]`);
        return;
      }
      state.view = 'drawer';
      state.drawerId = drawer.id;
      state.selectedItemId = '';
      state.notice = '';
      render('[data-ecm-action="select-item"]');
      return;
    }
    if (action === 'select-item') {
      state.selectedItemId = state.selectedItemId === button.dataset.ecmItem ? '' : button.dataset.ecmItem;
      render(`[data-ecm-item="${button.dataset.ecmItem}"]`);
      return;
    }
    if (action === 'close-item') {
      const selectedId = state.selectedItemId;
      state.selectedItemId = '';
      render(`[data-ecm-item="${selectedId}"]`);
    }
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape' || !root.isConnected) return;
    if (state.selectedItemId) {
      const selectedId = state.selectedItemId;
      state.selectedItemId = '';
      render(`[data-ecm-item="${selectedId}"]`);
    } else {
      goBack();
    }
  }

  root.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);
  render();
  return () => {
    root.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKeyDown);
  };
}
