import { SMUR_CONTAINERS } from './data/reference.js';
import { OperationalStore } from './application/operational-store.js';
import { normalizeBagExplorerIndex } from './ui/bag-explorer.js';
import { renderApp } from './ui/views.js';
import { navigate, routeParts } from './ui/utils.js';

const appRoot = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
const ui = {
  online: navigator.onLine,
  search: '',
  inventoryCategory: 'bags',
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
  mapZoom: 1,
  bagExplorerCatalog: null,
  bagExplorerIndexes: Object.create(null),
  bagExplorerDirections: Object.create(null)
};

let store;
let busy = false;
let bagSwipe = null;
const channel = 'BroadcastChannel' in globalThis ? new BroadcastChannel('releve-smur-updates') : null;

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
  const routeTitles = { home: 'Relève', return: 'Retour', actions: 'Actions', action: 'Action', inventory: 'Matériel', container: 'Contenant', reserve: 'Réserve', chariot: 'Chariot', audits: 'Contrôles', audit: 'Contrôle', expiry: 'Péremptions', defect: 'Défaut', map: 'Carte', stats: 'Analyse', history: 'Historique', profile: 'Profil' };
  appRoot.innerHTML = renderApp(store.state, ui, routeParts());
  document.title = `${routeTitles[currentRoute] || 'Relève'} — SMUR / Urgences`;
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

async function loadBagExplorerCatalog() {
  try {
    const response = await fetch('./src/data/bag-explorers.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    return catalog?.explorers ? catalog : null;
  } catch (error) {
    console.warn('Explorateurs de contenants indisponibles', error);
    return null;
  }
}

function moveBagExplorer(containerId, requestedIndex, direction = 'next', restoreFocus = false) {
  const config = ui.bagExplorerCatalog?.explorers?.[containerId];
  if (!config?.views?.length) return;
  ui.bagExplorerIndexes[containerId] = normalizeBagExplorerIndex(requestedIndex, config.views.length);
  ui.bagExplorerDirections[containerId] = direction;
  render();
  if (restoreFocus) appRoot.querySelector('[data-bag-explorer]')?.focus();
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
  const target = event.target.closest('button, [data-nav]');
  if (!target || target.disabled) return;
  if (target.dataset.nav) return navigate(target.dataset.nav);

  const explorer = target.closest('[data-bag-explorer]');
  if (explorer && target.dataset.bagExplorerStep) {
    const step = Number(target.dataset.bagExplorerStep);
    const current = Number(explorer.dataset.viewIndex);
    moveBagExplorer(explorer.dataset.bagExplorer, current + step, step < 0 ? 'previous' : 'next', true);
    return;
  }
  if (explorer && target.dataset.bagExplorerIndex) {
    const current = Number(explorer.dataset.viewIndex);
    const requested = Number(target.dataset.bagExplorerIndex);
    moveBagExplorer(explorer.dataset.bagExplorer, requested, requested < current ? 'previous' : 'next', true);
    return;
  }

  if (target.dataset.expiryFilter) {
    ui.expiryFilter = target.dataset.expiryFilter;
    render();
    return;
  }
  if (target.dataset.inventoryCategory) {
    ui.inventoryCategory = target.dataset.inventoryCategory;
    ui.inventoryExpanded = false;
    ui.search = '';
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

appRoot.addEventListener('keydown', (event) => {
  const explorer = event.target.closest('[data-bag-explorer]');
  if (!explorer || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const step = event.key === 'ArrowLeft' ? -1 : 1;
  moveBagExplorer(explorer.dataset.bagExplorer, Number(explorer.dataset.viewIndex) + step, step < 0 ? 'previous' : 'next', true);
});

appRoot.addEventListener('pointerdown', (event) => {
  const stage = event.target.closest('[data-bag-swipe]');
  if (!stage || event.button !== 0) return;
  bagSwipe = { stage, containerId: stage.dataset.bagSwipe, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, deltaX: 0, deltaY: 0 };
  stage.setPointerCapture?.(event.pointerId);
  stage.classList.add('is-dragging');
});

appRoot.addEventListener('pointermove', (event) => {
  if (!bagSwipe || bagSwipe.pointerId !== event.pointerId) return;
  bagSwipe.deltaX = event.clientX - bagSwipe.startX;
  bagSwipe.deltaY = event.clientY - bagSwipe.startY;
  const visualDelta = Math.abs(bagSwipe.deltaX) > Math.abs(bagSwipe.deltaY) ? Math.max(-72, Math.min(72, bagSwipe.deltaX)) : 0;
  bagSwipe.stage.style.setProperty('--bag-drag-x', `${visualDelta}px`);
  bagSwipe.stage.style.setProperty('--bag-drag-rotate', `${visualDelta / 24}deg`);
});

function finishBagSwipe(event, cancelled = false) {
  if (!bagSwipe || bagSwipe.pointerId !== event.pointerId) return;
  const { stage, containerId, deltaX, deltaY } = bagSwipe;
  stage.releasePointerCapture?.(event.pointerId);
  stage.classList.remove('is-dragging');
  stage.style.removeProperty('--bag-drag-x');
  stage.style.removeProperty('--bag-drag-rotate');
  bagSwipe = null;
  if (cancelled) return;
  if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
  const explorer = stage.closest('[data-bag-explorer]');
  const step = deltaX < 0 ? 1 : -1;
  moveBagExplorer(containerId, Number(explorer.dataset.viewIndex) + step, step < 0 ? 'previous' : 'next');
}

appRoot.addEventListener('pointerup', finishBagSwipe);
appRoot.addEventListener('pointercancel', (event) => finishBagSwipe(event, true));

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
  const [route, containerId] = routeParts();
  if (route === 'container' && ui.bagExplorerCatalog?.explorers?.[containerId]) {
    delete ui.bagExplorerIndexes[containerId];
    delete ui.bagExplorerDirections[containerId];
  }
  render(true);
});
window.addEventListener('online', () => { ui.online = true; render(); });
window.addEventListener('offline', () => { ui.online = false; render(); });
channel?.addEventListener('message', (event) => {
  if (event.data?.type === 'data-changed') store?.reload();
});

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
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
  } catch (error) {
    console.warn('Service worker non enregistré', error);
  }
}

async function boot() {
  appRoot.innerHTML = '<div class="p0-loading"><span></span><strong>Ouverture du journal local…</strong></div>';
  try {
    const [chariotReference, bagExplorerCatalog] = await Promise.all([loadChariotReference(), loadBagExplorerCatalog()]);
    ui.bagExplorerCatalog = bagExplorerCatalog;
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
