import { SMUR_CONTAINERS } from './data/reference.js';
import { OperationalStore } from './application/operational-store.js';
import { mountEmergencyAmpouleCase } from './features/emergency-ampoule-case/web.js';
import { mountEmergencyCartsModule } from './features/emergency-carts/web.js';
import { renderApp } from './ui/views.js';
import { navigate, routeParts } from './ui/utils.js';

const appRoot = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
const ui = {
  online: navigator.onLine,
  search: '',
  inventoryCategory: 'bags',
  inventoryFilter: 'all',
  inventoryExpanded: false,
  usageContainer: '',
  usageSection: '',
  usageItem: '',
  usageDeclaration: 'ouvert',
  actionFilter: 'open',
  expiryFilter: 'all',
  expirySearch: '',
  expiryItemId: '',
  defectContainer: SMUR_CONTAINERS[0].id,
  mapOrigin: 'pc-ide',
  mapZoom: 1
};

let store;
let busy = false;
let pendingScrollRestore = null;
let viewerScrollFrame = 0;
let viewerCompact = false;
let fullscreenViewerState = null;
let inlineViewerSwipeState = null;
let suppressFullscreenOpenUntil = 0;
let suppressFullscreenCloseUntil = 0;
let viewerLongPressState = null;
let cleanupEmergencyAmpouleCase = null;
let cleanupEmergencyCartsModule = null;
const VIEWER_LONG_PRESS_MS = 420;
const VIEWER_LONG_PRESS_MOVE_PX = 12;
const channel = 'BroadcastChannel' in globalThis ? new BroadcastChannel('releve-smur-updates') : null;

function syncDynamicInventoryViewer() {
  viewerScrollFrame = 0;
  const viewer = document.querySelector('[data-dynamic-inventory-viewer]');
  if (!viewer) return;
  const mainMedia = viewer.querySelector('[data-viewer-main-media]');
  const compact = viewer.querySelector('.dynamic-inventory-viewer__compact');
  const compactTop = compact ? Number.parseFloat(getComputedStyle(compact).top) || 0 : 0;
  viewerCompact = Boolean(mainMedia && mainMedia.getBoundingClientRect().bottom <= compactTop);
  viewer.classList.toggle('is-compact', viewerCompact);
  viewer.dataset.compact = String(viewerCompact);
  compact?.setAttribute('aria-hidden', String(!viewerCompact));
}

function setupDynamicInventoryViewer() {
  const viewer = document.querySelector('[data-dynamic-inventory-viewer]');
  if (!viewer) return;
  const bounds = viewer.getBoundingClientRect();
  viewer.style.setProperty('--viewer-left', `${Math.round(bounds.left)}px`);
  viewer.style.setProperty('--viewer-width', `${Math.round(bounds.width)}px`);
  syncDynamicInventoryViewer();
}

function scheduleViewerSync() {
  if (viewerScrollFrame) return;
  viewerScrollFrame = window.requestAnimationFrame(syncDynamicInventoryViewer);
}

function navigateContainerWithoutScrollJump(route) {
  const nextHash = `#/${route}`;
  if (location.hash === nextHash) return;
  pendingScrollRestore = { x: window.scrollX, y: window.scrollY };
  navigate(route);
}

function restorePendingScroll() {
  if (!pendingScrollRestore) return;
  const position = pendingScrollRestore;
  pendingScrollRestore = null;
  window.requestAnimationFrame(() => {
    window.scrollTo(position.x, position.y);
    setupDynamicInventoryViewer();
  });
}

function openInventoryFullscreen(viewer, opener) {
  const overlay = viewer?.querySelector('[data-viewer-fullscreen]');
  if (!overlay || fullscreenViewerState) return;
  const scrollY = window.scrollY;
  fullscreenViewerState = {
    scrollY,
    opener,
    touchStartX: null,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    bodyLeft: document.body.style.left,
    bodyRight: document.body.style.right
  };
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.classList.add('inventory-viewer-open');
  overlay.hidden = false;
  showFullscreenSlide(overlay, Number(overlay.dataset.activeSlide || 0));
  overlay.querySelector('[data-viewer-fullscreen-close]')?.focus({ preventScroll: true });
}

function showFullscreenSlide(overlay, requestedIndex) {
  const slides = [...(overlay?.querySelectorAll('[data-viewer-slide]') || [])];
  if (!slides.length) return;
  const index = (requestedIndex + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === index;
    slide.hidden = !active;
    slide.classList.toggle('active', active);
  });
  overlay.dataset.activeSlide = String(index);
  const counter = overlay.querySelector('[data-viewer-gallery-count]');
  if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
}

function stepFullscreenGallery(direction) {
  const overlay = document.querySelector('[data-viewer-fullscreen]:not([hidden])');
  if (!overlay) return;
  showFullscreenSlide(overlay, Number(overlay.dataset.activeSlide || 0) + direction);
}

function closeInventoryFullscreen() {
  if (!fullscreenViewerState) return;
  const state = fullscreenViewerState;
  const overlay = document.querySelector('[data-viewer-fullscreen]:not([hidden])');
  const activeRoute = overlay?.querySelector('[data-viewer-slide]:not([hidden])')?.dataset.containerRoute;
  if (overlay) overlay.hidden = true;
  document.body.classList.remove('inventory-viewer-open');
  document.body.style.position = state.bodyPosition;
  document.body.style.top = state.bodyTop;
  document.body.style.left = state.bodyLeft;
  document.body.style.right = state.bodyRight;
  fullscreenViewerState = null;
  state.opener?.focus({ preventScroll: true });
  if (activeRoute && location.hash !== `#/${activeRoute}`) {
    pendingScrollRestore = { x: 0, y: state.scrollY };
    navigate(activeRoute);
    return;
  }
  window.requestAnimationFrame(() => {
    window.scrollTo(0, state.scrollY);
    syncDynamicInventoryViewer();
  });
}

function cancelViewerLongPress(pointerId = null) {
  if (!viewerLongPressState || (pointerId !== null && viewerLongPressState.pointerId !== pointerId)) return;
  window.clearTimeout(viewerLongPressState.timer);
  viewerLongPressState.button.classList.remove('is-pressing');
  viewerLongPressState = null;
}

function startViewerLongPress(event, button) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  cancelViewerLongPress();
  const state = {
    pointerId: event.pointerId,
    button,
    startX: event.clientX,
    startY: event.clientY,
    activated: false,
    timer: 0
  };
  button.classList.add('is-pressing');
  state.timer = window.setTimeout(() => {
    if (viewerLongPressState !== state || !button.isConnected) return;
    state.activated = true;
    suppressFullscreenOpenUntil = Date.now() + 800;
    button.classList.remove('is-pressing');
    try {
      navigator.vibrate?.(18);
    } catch {
      // La vibration est optionnelle et peut être refusée par iOS.
    }
    openInventoryFullscreen(button.closest('[data-dynamic-inventory-viewer]'), button);
  }, VIEWER_LONG_PRESS_MS);
  viewerLongPressState = state;
}

function showToast(message, tone = 'saved', action = null) {
  const toast = document.createElement('div');
  toast.className = `toast ${tone}`;
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(text);
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    button.addEventListener('click', action.onClick, { once: true });
    toast.append(button);
  }
  toastRoot.append(toast);
  window.setTimeout(() => toast.remove(), action ? 12000 : 3600);
}

function render(focusHeading = false) {
  if (!store?.state.ready) return;
  const currentRoute = routeParts()[0];
  const routeTitles = { home: 'Relève', return: 'Retour', actions: 'Actions', action: 'Action', inventory: 'Matériel', container: 'Contenant', reserve: 'Réserve', chariot: 'Chariot', 'emergency-carts': 'Chariots adultes', audits: 'Contrôles', audit: 'Contrôle', expiry: 'Péremptions', defect: 'Défaut', map: 'Carte', stats: 'Analyse', history: 'Historique', profile: 'Profil' };
  cleanupEmergencyAmpouleCase?.();
  cleanupEmergencyAmpouleCase = null;
  cleanupEmergencyCartsModule?.();
  cleanupEmergencyCartsModule = null;
  appRoot.innerHTML = renderApp(store.state, ui, routeParts());
  document.title = `${routeTitles[currentRoute] || 'Relève'} — SMUR / Urgences`;
  const emergencyCartsRoot = appRoot.querySelector('[data-emergency-carts-root]');
  if (emergencyCartsRoot) {
    cleanupEmergencyCartsModule = mountEmergencyCartsModule(emergencyCartsRoot, {
      onExit: () => navigate('inventory')
    });
  }
  const emergencyAmpouleCaseRoot = appRoot.querySelector('[data-emergency-ampoule-case-root]');
  if (emergencyAmpouleCaseRoot) {
    cleanupEmergencyAmpouleCase = mountEmergencyAmpouleCase(emergencyAmpouleCaseRoot);
  }
  setupDynamicInventoryViewer();
  if (focusHeading === true) appRoot.querySelector('.page-title')?.focus();
}

async function loadChariotReference() {
  try {
    const response = await fetch('./src/data/chariot-reference.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Référentiel chariots indisponible', error);
    return null;
  }
}

async function perform(operation, successMessage = '') {
  if (busy) return null;
  busy = true;
  appRoot.setAttribute('aria-busy', 'true');
  try {
    const result = await operation();
    if (successMessage) showToast(successMessage);
    channel?.postMessage({ type: 'data-changed' });
    return result;
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Opération impossible', 'error');
    return null;
  } finally {
    busy = false;
    appRoot.removeAttribute('aria-busy');
  }
}

appRoot.addEventListener('click', async (event) => {
  const fullscreenImage = event.target.closest('[data-viewer-fullscreen-image]');
  if (fullscreenImage && fullscreenViewerState) {
    if (Date.now() < suppressFullscreenCloseUntil) return;
    closeInventoryFullscreen();
    return;
  }
  const target = event.target.closest('button, [data-nav]');
  if (!target || target.disabled) return;
  if (target.dataset.viewerCompactMedia !== undefined) {
    if (Date.now() < suppressFullscreenOpenUntil) return;
    if (event.detail === 0) {
      openInventoryFullscreen(target.closest('[data-dynamic-inventory-viewer]'), target);
      return;
    }
    target.classList.remove('is-tap-bounce');
    void target.offsetWidth;
    target.classList.add('is-tap-bounce');
    window.setTimeout(() => target.classList.remove('is-tap-bounce'), 320);
    return;
  }
  if (target.dataset.viewerFullscreenOpen !== undefined) {
    if (Date.now() < suppressFullscreenOpenUntil) return;
    openInventoryFullscreen(target.closest('[data-dynamic-inventory-viewer]'), target);
    return;
  }
  if (target.dataset.viewerFullscreenClose !== undefined) {
    closeInventoryFullscreen();
    return;
  }
  if (target.dataset.viewerGalleryPrev !== undefined) {
    stepFullscreenGallery(-1);
    return;
  }
  if (target.dataset.viewerGalleryNext !== undefined) {
    stepFullscreenGallery(1);
    return;
  }
  if (target.dataset.containerNav) {
    navigateContainerWithoutScrollJump(target.dataset.containerNav);
    return;
  }
  if (target.dataset.nav) return navigate(target.dataset.nav);

  if (target.dataset.expiryFilter) {
    ui.expiryFilter = target.dataset.expiryFilter;
    render();
    return;
  }
  if (target.dataset.inventoryCategory) {
    ui.inventoryCategory = target.dataset.inventoryCategory;
    ui.inventoryFilter = 'all';
    ui.inventoryExpanded = false;
    ui.search = '';
    render();
    return;
  }
  if (target.dataset.inventoryFilter) {
    ui.inventoryFilter = target.dataset.inventoryFilter;
    render();
    return;
  }
  if (target.dataset.inventoryExpand) {
    ui.inventoryExpanded = target.dataset.inventoryExpand === 'true';
    ui.search = '';
    render();
    if (ui.inventoryExpanded) document.querySelector('#reference-search')?.focus();
    return;
  }
  if (target.dataset.selectExpiryItem) {
    ui.expiryItemId = target.dataset.selectExpiryItem;
    render();
    document.querySelector('#expiry-lot-form input[name="lotNumber"]')?.focus();
    return;
  }
  if (target.dataset.clearExpiryItem) {
    ui.expiryItemId = '';
    render();
    document.querySelector('#expiry-reference-search')?.focus();
    return;
  }

  if (target.dataset.schemaAction === 'select-usage-section') {
    const selectedSectionId = target.dataset.schemaValue;
    ui.usageSection = selectedSectionId;
    ui.usageItem = '';
    render();
    [...document.querySelectorAll('[data-schema-action="select-usage-section"]')].find((button) => button.dataset.schemaValue === selectedSectionId)?.focus();
    return;
  }
  if (target.dataset.returnContainer) {
    ui.usageContainer = target.dataset.returnContainer;
    ui.usageSection = target.dataset.returnSection || '';
    ui.usageItem = '';
    ui.usageDeclaration = 'ouvert';
    navigate('return');
    return;
  }
  if (target.dataset.startAudit) {
    const audit = await perform(() => store.startAudit(target.dataset.startAudit, target.dataset.originAction || null, target.dataset.auditSection || null), 'Contrôle démarré');
    if (audit) navigate(`audit/${audit.id}`);
    return;
  }
  if (target.dataset.resumeAudit) {
    const audit = await perform(() => store.resumeAudit(target.dataset.resumeAudit), 'Contrôle repris');
    if (audit) navigate(`audit/${audit.id}`);
    return;
  }
  if (target.dataset.pauseAudit) {
    const paused = await perform(() => store.pauseAudit(target.dataset.pauseAudit), 'Contrôle mis en pause');
    if (paused !== null) navigate('audits');
    return;
  }
  if (target.dataset.observeConforme) {
    await perform(() => store.recordAuditObservation({ auditId: target.dataset.observeConforme, itemId: target.dataset.itemId, result: 'conforme' }), 'Observation enregistrée');
    return;
  }
  if (target.dataset.completeAudit) {
    const done = await perform(() => store.completeAudit(target.dataset.completeAudit), 'Contrôle clôturé');
    if (done !== null) navigate('actions');
    return;
  }
  if (target.dataset.toggleLine) {
    await perform(() => store.toggleActionLine(target.dataset.toggleLine, target.dataset.itemId));
    return;
  }
  if (target.dataset.localizeExpiryAction) {
    await perform(() => store.localizeExpiryAction(target.dataset.localizeExpiryAction), 'Emplacement confirmé');
    return;
  }
  if (target.dataset.advanceAction) {
    await perform(() => store.advanceAction(target.dataset.advanceAction), 'Étape enregistrée');
    return;
  }
  if (target.dataset.actionFilter) {
    ui.actionFilter = target.dataset.actionFilter;
    render();
    return;
  }
  if (target.dataset.mapZoom) {
    ui.mapZoom = target.dataset.mapZoom === 'in' ? Math.min(2.5, ui.mapZoom + 0.25) : target.dataset.mapZoom === 'out' ? Math.max(1, ui.mapZoom - 0.25) : 1;
    render();
    return;
  }
  if (target.dataset.planExpiry) {
    const action = await perform(() => store.planExpiryReplacement(target.dataset.planExpiry), 'Remplacement planifié');
    if (action) navigate(`expiry/lot/${target.dataset.planExpiry}`);
    return;
  }
});

appRoot.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  if (form.id === 'usage-form') {
    const action = await perform(() => store.declareReturn({
      containerId: data.get('containerId'), sectionId: data.get('sectionId') || null, itemId: data.get('itemId') || null,
      declaration: data.get('declaration'), quantity: data.get('quantity') || 1, note: data.get('note')
    }), 'Déclaration enregistrée');
    if (action) navigate(`action/${action.id}`);
  } else if (form.id === 'observation-form') {
    await perform(() => store.recordAuditObservation({
      auditId: data.get('auditId'), itemId: data.get('itemId'), result: data.get('result'),
      observedQuantity: data.get('observedQuantity'), note: data.get('note'), severity: data.get('severity')
    }), 'Écart enregistré et action créée');
  } else if (form.id === 'defect-form') {
    const action = await perform(() => store.reportDefect({
      containerId: data.get('containerId'), itemId: data.get('itemId') || null, note: data.get('note'), blocking: data.get('blocking') === 'on'
    }), 'Défaut enregistré');
    if (action) navigate(`action/${action.id}`);
  } else if (form.id === 'role-form') {
    await perform(() => store.setUserRole(data.get('role')), 'Rôle local enregistré');
  } else if (form.id === 'audit-assignment-form') {
    await perform(() => store.assignAudit(data.get('auditId'), data.get('userId'), data.get('reason')), 'Passation enregistrée');
  } else if (form.id === 'expiry-lot-form') {
    const lot = await perform(() => store.addTrackedLot({
      itemId: data.get('itemId'),
      containerId: data.get('containerId'),
      sectionId: data.get('sectionId'),
      locationId: data.get('locationId'),
      locationStatus: data.get('locationStatus'),
      lotNumber: data.get('lotNumber'),
      expiryMonth: data.get('expiryMonth'),
      quantity: data.get('quantity')
    }), 'Lot enregistré');
    if (lot) {
      ui.expiryFilter = 'all';
      ui.expirySearch = '';
      ui.expiryItemId = '';
      navigate('expiry');
    }
  } else if (form.id === 'expiry-removal-form') {
    await perform(() => store.removeExpiryLot(data.get('actionId'), {
      quantity: data.get('quantity'),
      reason: data.get('reason')
    }), 'Retrait enregistré');
  } else if (form.id === 'expiry-replacement-form') {
    await perform(() => store.replaceExpiryLot(data.get('actionId'), {
      lotNumber: data.get('lotNumber'),
      expiryMonth: data.get('expiryMonth'),
      quantity: data.get('quantity')
    }), 'Remplacement enregistré');
  } else if (form.id === 'expiry-validation-form') {
    const completed = await perform(() => store.validateExpiryReplacement(data.get('actionId'), {
      removed: data.get('removed') === 'on',
      replaced: data.get('replaced') === 'on',
      quantityConform: data.get('quantityConform') === 'on',
      dateRecorded: data.get('dateRecorded') === 'on',
      containerAvailable: data.get('containerAvailable') === 'on'
    }), 'Traitement clôturé');
    if (completed) {
      ui.expiryFilter = 'treated';
      navigate('expiry');
    }
  } else if (form.id === 'expiry-completion-form') {
    const lot = await perform(() => store.completeExpiryAction(data.get('actionId'), { lotNumber: data.get('lotNumber'), expiryMonth: data.get('expiryMonth'), quantity: data.get('quantity') }), 'Nouveau lot enregistré');
    if (lot) navigate('expiry');
  }
});

appRoot.addEventListener('input', (event) => {
  if (!['reference-search', 'expiry-reference-search'].includes(event.target.id)) return;
  const expirySearch = event.target.id === 'expiry-reference-search';
  if (expirySearch) {
    ui.expirySearch = event.target.value;
    ui.expiryItemId = '';
  } else {
    ui.search = event.target.value;
  }
  const position = event.target.selectionStart;
  render();
  const input = document.querySelector(expirySearch ? '#expiry-reference-search' : '#reference-search');
  input?.focus();
  input?.setSelectionRange(position, position);
});

function renderAndRestoreFocus(elementId) {
  render();
  document.getElementById(elementId)?.focus();
}

appRoot.addEventListener('change', (event) => {
  if (event.target.id === 'usage-container') {
    ui.usageContainer = event.target.value;
    ui.usageSection = '';
    ui.usageItem = '';
    renderAndRestoreFocus('usage-container');
  } else if (event.target.id === 'usage-section') {
    ui.usageSection = event.target.value;
    ui.usageItem = '';
    renderAndRestoreFocus('usage-section');
  } else if (event.target.id === 'usage-item') {
    ui.usageItem = event.target.value;
    renderAndRestoreFocus('usage-item');
  } else if (event.target.id === 'usage-declaration') {
    ui.usageDeclaration = event.target.value;
    renderAndRestoreFocus('usage-declaration');
  } else if (event.target.id === 'defect-container') {
    ui.defectContainer = event.target.value;
    renderAndRestoreFocus('defect-container');
  } else if (event.target.id === 'map-origin') {
    ui.mapOrigin = event.target.value;
    renderAndRestoreFocus('map-origin');
  }
});

window.addEventListener('hashchange', () => {
  const preserveScroll = Boolean(pendingScrollRestore);
  render(!preserveScroll);
  if (preserveScroll) restorePendingScroll();
});

appRoot.addEventListener('error', (event) => {
  const image = event.target.closest?.('[data-viewer-image]');
  if (!image) return;
  if (image.dataset.fallbackApplied === 'true') {
    image.hidden = true;
    image.closest('.dynamic-inventory-viewer__image-button')?.querySelector('[data-viewer-missing]')?.removeAttribute('hidden');
    return;
  }
  image.dataset.fallbackApplied = 'true';
  image.src = image.dataset.fallbackSrc;
  image.closest('.dynamic-inventory-viewer__image-button')?.querySelector('[data-viewer-missing]')?.removeAttribute('hidden');
}, true);

appRoot.addEventListener('touchstart', (event) => {
  if (fullscreenViewerState && event.target.closest('[data-viewer-gallery]')) {
    fullscreenViewerState.touchStartX = event.changedTouches[0]?.clientX ?? null;
    return;
  }
  const swipeArea = event.target.closest('.dynamic-inventory-viewer__image-button, .dynamic-inventory-viewer__compact-image');
  const viewer = swipeArea?.closest('[data-viewer-swipe]');
  const touch = event.changedTouches[0];
  if (!viewer || !touch) return;
  inlineViewerSwipeState = {
    viewer,
    startX: touch.clientX,
    startY: touch.clientY
  };
}, { passive: true });

appRoot.addEventListener('touchend', (event) => {
  if (fullscreenViewerState && fullscreenViewerState.touchStartX !== null && event.target.closest('[data-viewer-gallery]')) {
    const delta = (event.changedTouches[0]?.clientX ?? fullscreenViewerState.touchStartX) - fullscreenViewerState.touchStartX;
    fullscreenViewerState.touchStartX = null;
    if (Math.abs(delta) >= 48) {
      suppressFullscreenCloseUntil = Date.now() + 450;
      stepFullscreenGallery(delta < 0 ? 1 : -1);
    }
    return;
  }
  if (!inlineViewerSwipeState) return;
  const state = inlineViewerSwipeState;
  inlineViewerSwipeState = null;
  const touch = event.changedTouches[0];
  if (!touch || !state.viewer.isConnected) return;
  const deltaX = touch.clientX - state.startX;
  const deltaY = touch.clientY - state.startY;
  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
  const route = deltaX < 0 ? state.viewer.dataset.viewerSwipeNext : state.viewer.dataset.viewerSwipePrev;
  if (!route) return;
  suppressFullscreenOpenUntil = Date.now() + 450;
  navigateContainerWithoutScrollJump(route);
}, { passive: true });
appRoot.addEventListener('touchcancel', () => {
  inlineViewerSwipeState = null;
  if (fullscreenViewerState) fullscreenViewerState.touchStartX = null;
}, { passive: true });
appRoot.addEventListener('pointerdown', (event) => {
  const button = event.target.closest('[data-viewer-compact-media]');
  if (button) startViewerLongPress(event, button);
});
appRoot.addEventListener('pointermove', (event) => {
  const state = viewerLongPressState;
  if (!state || state.pointerId !== event.pointerId) return;
  if (Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > VIEWER_LONG_PRESS_MOVE_PX) {
    cancelViewerLongPress(event.pointerId);
  }
}, { passive: true });
appRoot.addEventListener('pointerup', (event) => cancelViewerLongPress(event.pointerId));
appRoot.addEventListener('pointercancel', (event) => cancelViewerLongPress(event.pointerId));
appRoot.addEventListener('contextmenu', (event) => {
  if (event.target.closest('[data-viewer-compact-media]')) event.preventDefault();
});
window.addEventListener('scroll', scheduleViewerSync, { passive: true });
window.addEventListener('resize', setupDynamicInventoryViewer, { passive: true });
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && fullscreenViewerState) closeInventoryFullscreen();
});
window.addEventListener('online', () => { ui.online = true; render(); });
window.addEventListener('offline', () => { ui.online = false; render(); });
channel?.addEventListener('message', (event) => {
  if (event.data?.type === 'data-changed') store?.reload();
});

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    const offerUpdate = (worker) => {
      showToast('Une mise à jour est prête.', 'saved', {
        label: 'Actualiser',
        onClick: () => {
          let reloading = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloading) return;
            reloading = true;
            location.reload();
          }, { once: true });
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    };
    if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          offerUpdate(worker);
        }
      });
    });
    await registration.update();
  } catch (error) {
    console.warn('Service worker non enregistré', error);
  }
}

async function boot() {
  appRoot.innerHTML = '<div class="p0-loading"><span></span><strong>Ouverture du journal local…</strong></div>';
  try {
    const chariotReference = await loadChariotReference();
    store = await OperationalStore.create(chariotReference);
    store.subscribe(render);
    render();
    await registerServiceWorker();
  } catch (error) {
    console.error(error);
    appRoot.innerHTML = '<div class="p0-fatal"><h1>Impossible d’ouvrir l’application</h1><p id="fatal-message"></p><button id="fatal-retry">Réessayer</button></div>';
    document.querySelector('#fatal-message').textContent = String(error.message || error);
    document.querySelector('#fatal-retry').addEventListener('click', () => location.reload());
  }
}

boot();
