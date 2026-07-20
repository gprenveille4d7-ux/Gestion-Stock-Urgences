import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { OperationalStore } from '../src/application/operational-store.js';
import { SMUR_CONTAINERS } from '../src/data/reference.js';
import { getContainerDiagram } from '../src/data/visual-schemas.js';
import { renderVisualSchema } from '../src/ui/visual-schema.js';
import { renderApp } from '../src/ui/views.js';

test('toutes les routes P0 produisent un écran exploitable sans valeur invalide', async () => {
  const chariots = JSON.parse(await readFile(new URL('../src/data/chariot-reference.json', import.meta.url), 'utf8'));
  const store = await OperationalStore.create(chariots);
  const section = SMUR_CONTAINERS.find((container) => container.id === 'sac-vert-pedia').sections.find((candidate) => candidate.id.endsWith(':kit-perfusion'));
  const audit = await store.startAudit('sac-vert-pedia', null, section.id);
  const operationalAction = {
    id: 'ui-test-action', type: 'rearmement', title: 'Réarmer le kit perfusion', status: 'open', priority: 'haute',
    containerId: 'sac-vert-pedia', targetZoneId: null, targetZoneStatus: 'missing-to-validate', finalZoneId: null,
    finalZoneStatus: 'missing-to-validate', lines: [{ itemId: section.items[0].id, quantity: 1, done: false }],
    createdAt: new Date().toISOString(), source: 'user-entry'
  };
  const state = { ...store.state, actions: [...store.state.actions, operationalAction] };
  const ui = {
    online: false,
    search: 'adrénaline',
    inventoryCategory: 'bags',
    inventoryExpanded: false,
    usageContainer: 'sac-vert-pedia',
    usageSection: section.id,
    usageItem: section.items[0].id,
    usageDeclaration: 'utilise',
    actionFilter: 'open',
    expiryFilter: 'all',
    expirySearch: '',
    expiryItemId: '',
    defectContainer: 'sac-bleu-respi',
    mapOrigin: 'pc-ide',
    mapZoom: 1.25
  };
  const routes = [
    ['home'], ['return'], ['inventory'], ['container', 'sac-vert-pedia'], ['container', 'sac-vert-pedia', 'kit-perfusion'],
    ['reserve', 'reserve-smur'], ['chariot', 'chariot-pediatrique'], ['actions'], ['action', operationalAction.id], ['audits'], ['audit', audit.id],
    ['expiry'], ['expiry', 'add'], ['defect'], ['map'], ['stats'], ['history'], ['profile']
  ];
  for (const route of routes) {
    const html = renderApp(state, ui, route);
    assert.ok(html.length > 1500, `${route.join('/')} trop court`);
    assert.equal(html.includes('>undefined<'), false, route.join('/'));
    assert.equal(html.includes('NaN'), false, route.join('/'));
    assert.ok(html.includes('class="app-shell"'), route.join('/'));
    assert.ok(html.includes('class="page-title" tabindex="-1"'), route.join('/'));
    assert.ok(html.includes('role="status" aria-live="polite"'), route.join('/'));
  }

  const homeHtml = renderApp(state, ui, ['home']);
  assert.ok(homeHtml.includes('Gestion Stock Urgences'));
  assert.ok(homeHtml.includes(`Bonjour ${state.user.displayName}`));
  assert.ok(homeHtml.includes(state.user.role));
  assert.ok(homeHtml.includes('État général'));
  assert.equal((homeHtml.match(/class="home-primary-menu /g) || []).length, 4);
  for (const [label, route] of [["Retour d’intervention", 'return'], ['Commencer un contrôle', 'audits'], ['Réarmement SMUR', 'actions'], ['Statistiques', 'stats']]) {
    assert.ok(homeHtml.includes(label), label);
    assert.ok(homeHtml.includes(`class="home-quick-action" data-nav="${route}"`), route);
  }
  for (const label of ['Inventaire SMUR', 'Chariot d’urgence', 'Les Réserves', 'Péremptions']) assert.ok(homeHtml.includes(label), label);
  assert.ok(homeHtml.includes('data-nav="inventory"'));
  assert.ok(homeHtml.includes('data-nav="reserve/reserve-smur"'));

  for (const container of SMUR_CONTAINERS) {
    const overview = renderApp(store.state, { ...ui, search: '' }, ['container', container.id]);
    assert.ok(overview.includes(`class="container-detail-hero"`), container.id);
    assert.equal(
      (overview.match(/class="container-compartment-row/g) || []).length,
      container.sections.length,
      container.id
    );
    for (const inventorySection of container.sections) {
      const token = inventorySection.id.split(':').at(-1);
      const detail = renderApp(store.state, { ...ui, search: '' }, ['container', container.id, token]);
      assert.ok(detail.includes(`data-return-section="${inventorySection.id}"`), inventorySection.id);
      assert.equal(
        (detail.match(/class="inventory-line"/g) || []).length,
        inventorySection.items.length,
        inventorySection.id
      );
    }
  }

  for (const reference of chariots.references) {
    const overview = renderApp(store.state, { ...ui, search: '' }, ['chariot', reference.id]);
    assert.ok(overview.includes(`data-schema-kind="chariot"`), reference.id);
    for (const inventorySection of reference.containers) {
      const detail = renderApp(store.state, { ...ui, search: '' }, ['chariot', reference.id, inventorySection.id]);
      assert.equal(
        (detail.match(/class="inventory-line"/g) || []).length,
        inventorySection.items.length,
        inventorySection.id
      );
    }
  }

  for (const reserveId of ['reserve-1', 'reserve-smur', 'reserve-respi']) {
    const detail = renderApp(store.state, { ...ui, search: '' }, ['reserve', reserveId]);
    assert.ok(detail.includes(`data-schema-kind="reserve"`), reserveId);
    assert.ok(detail.includes('Stock de réarmement non cartographié'), reserveId);
  }

  const singleSectionContainer = SMUR_CONTAINERS.find((container) => container.sections.length === 1);
  const singleTargetId = singleSectionContainer.sections[0].id;
  const validatedDiagram = getContainerDiagram(singleSectionContainer, {
    version: 'schema-valide-ui-1',
    status: 'validated',
    zones: { [singleTargetId]: { status: 'validated', physical: true } }
  });
  const validatedDiagramHtml = renderVisualSchema(validatedDiagram, { kind: 'container' });
  assert.ok(validatedDiagramHtml.includes('visual-hotspot is-validated'));
  assert.ok(validatedDiagramHtml.includes('Organisation visuelle validée'));
  assert.ok(validatedDiagramHtml.includes('role="group" aria-label="Zones interactives'));
  assert.equal(validatedDiagramHtml.includes('visual-hotspot is-ready'), false, 'un schéma validé ne prouve pas que le matériel est prêt');

  const edgeDiagramHtml = renderVisualSchema({
    id: 'edge', kind: 'container', label: 'Bord', version: 'test', status: 'draft-to-validate', aspectRatio: '4 / 3',
    image: null, zones: [{ id: 'edge:zone', targetId: 'edge-zone', label: 'Bord', kind: 'compartment', order: 0, status: 'draft-to-validate', x: 99, y: 99, w: 1, h: 1 }]
  });
  assert.ok(edgeDiagramHtml.includes('left:85%;top:82%;width:15%;height:18%'));

  const returnHtml = renderApp(store.state, ui, ['return']);
  assert.ok(returnHtml.includes('Créer le réarmement ciblé'));
  assert.ok(returnHtml.includes('Le sac parent est déduit automatiquement'));
  assert.ok(returnHtml.includes('data-schema-action="select-usage-section"'));

  const inventoryHtml = renderApp(store.state, { ...ui, search: '', inventoryCategory: 'bags', inventoryExpanded: false }, ['inventory']);
  assert.ok(inventoryHtml.includes('Catégories d’inventaires'));
  assert.ok(inventoryHtml.includes('Sacs &amp; Kits'));
  assert.ok(inventoryHtml.includes('Frigos &amp; Valises'));
  assert.ok(inventoryHtml.includes('Voir tous les sacs & kits'));
  assert.equal((inventoryHtml.match(/class="inventory-list-row"/g) || []).length, 6);
  for (const containerId of ['sac-rouge-solutes', 'sac-bleu-respi', 'sac-vert-pedia', 'sac-noir-mater', 'sac-plaies', 'sac-orange-damage-control']) {
    assert.ok(inventoryHtml.includes(`data-nav="container/${containerId}"`), containerId);
  }
  const expandedInventoryHtml = renderApp(store.state, { ...ui, search: '', inventoryCategory: 'bags', inventoryExpanded: true }, ['inventory']);
  assert.ok(expandedInventoryHtml.includes('id="reference-search"'));
  assert.ok(expandedInventoryHtml.includes('Réduire la liste'));
  assert.ok(expandedInventoryHtml.includes('Autres inventaires'));
  assert.ok(expandedInventoryHtml.includes('Réserve SMUR'));
  assert.ok(expandedInventoryHtml.includes('data-nav="chariot/chariot-pediatrique"'));
  const coldInventoryHtml = renderApp(store.state, { ...ui, search: '', inventoryCategory: 'cold', inventoryExpanded: false }, ['inventory']);
  assert.ok(coldInventoryHtml.includes('Valise intra-osseuse'));
  assert.ok(coldInventoryHtml.includes('Frigo médicaments'));
  assert.equal((coldInventoryHtml.match(/class="inventory-list-row"/g) || []).length, 2);
  const actionListHtml = renderApp(state, ui, ['actions']);
  assert.ok(actionListHtml.includes('Réarmer le kit perfusion'));
  assert.equal(/prototype|démonstration|données de démonstration|lot de démonstration|action de démonstration/i.test(actionListHtml), false);
  const missingSyntheticActionHtml = renderApp(state, ui, ['action', 'action-demo-biseptine']);
  assert.ok(missingSyntheticActionHtml.includes('Action introuvable'));
  const mapHtml = renderApp(state, ui, ['map']);
  assert.ok(mapHtml.includes('sans emplacement opérationnel validé'));
  const searchedInventoryHtml = renderApp(store.state, { ...ui, search: 'adrénaline' }, ['inventory']);
  assert.ok(searchedInventoryHtml.includes('affectation de zone à confirmer'));

  const containerHtml = renderApp(store.state, ui, ['container', 'sac-vert-pedia']);
  assert.ok(containerHtml.includes('class="container-detail-hero"'));
  assert.ok(containerHtml.includes('105 éléments au total'));
  assert.ok(containerHtml.includes('id="container-compartments-title"'));
  assert.ok(containerHtml.includes('Voir l’inventaire complet'));
  assert.equal((containerHtml.match(/class="container-compartment-row/g) || []).length, 11);
  assert.ok(containerHtml.includes('data-nav="container/sac-vert-pedia/ampoulier"'));

  const selectedCompartmentHtml = renderApp(store.state, ui, ['container', 'sac-vert-pedia', 'ampoulier']);
  assert.ok(selectedCompartmentHtml.includes('Compartiment 1'));
  assert.ok(selectedCompartmentHtml.includes('Adrénaline 1 mg'));
  assert.ok(selectedCompartmentHtml.includes('data-audit-section="sac-vert-pedia:ampoulier"'));

  const reserveHtml = renderApp(store.state, ui, ['reserve', 'reserve-1']);
  assert.ok(reserveHtml.includes('PHOTO DE LA RÉSERVE À AJOUTER'));
  assert.ok(reserveHtml.includes('Organisation visuelle à préciser · armoires, étagères et bacs à relever sur place.'));
  assert.equal(reserveHtml.includes('reserve-warning'), false);

  const degradedState = { ...state, chariotReference: null };
  const degradedInventory = renderApp(degradedState, { ...ui, search: '', inventoryExpanded: true }, ['inventory']);
  assert.ok(degradedInventory.includes('Référentiel chariots indisponible'));
  const degradedProfile = renderApp(degradedState, ui, ['profile']);
  assert.ok(degradedProfile.includes('0/3 inventaires XLSX chargés'));
});

test('les annotations source des chariots restent visibles sans devenir des lignes actives', async () => {
  const chariots = JSON.parse(await readFile(new URL('../src/data/chariot-reference.json', import.meta.url), 'utf8'));
  const reference = chariots.references.find((candidate) => candidate.id === 'chariot-pediatrique');
  const section = reference.containers[0];
  section.sourceAnnotations = [{
    label: 'LIBELLÉ SOURCE QUANTITÉ NULLE', sourceCell: 'B2', expectedQuantity: 0,
    validationIssue: 'Quantité source non positive à confirmer', sourceStatus: 'source-ambiguity-to-validate'
  }];
  const state = expiryState({ chariotReference: chariots });
  const html = renderApp(state, expiryUi, ['chariot', reference.id, section.id]);
  assert.equal((html.match(/class="inventory-line"/g) || []).length, section.items.length);
  assert.ok(html.includes('LIBELLÉ SOURCE QUANTITÉ NULLE'));
  assert.ok(html.includes('quantité source 0 · non activée dans le total théorique'));
  assert.ok(html.includes('source-ambiguity-to-validate'));
  assert.equal(html.includes('Source historique uniquement'), false);
  assert.ok(html.includes('Référentiel actif'));
});

function atDayOffset(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function expiryState(overrides = {}) {
  return {
    ready: true,
    persistent: true,
    user: { id: 'local-user', displayName: 'Utilisateur local', role: 'soignant' },
    users: [], events: [], audits: [], observations: [], anomalies: [], actions: [], lots: [], outbox: [], metadata: [], settings: [],
    sync: { status: 'local-only', pending: 0, sent: 0 }, chariotReference: null,
    ...overrides
  };
}

const expiryUi = {
  online: true, search: '', usageContainer: '', usageSection: '', usageItem: '', usageDeclaration: 'ouvert',
  actionFilter: 'open', expiryFilter: 'all', expirySearch: '', expiryItemId: '', defectContainer: 'sac-bleu-respi',
  mapOrigin: 'pc-ide', mapZoom: 1
};

test('une installation neuve montre quatre panneaux à zéro et aucun contenu inventé', () => {
  const html = renderApp(expiryState(), expiryUi, ['expiry']);
  assert.equal((html.match(/class="expiry-panel /g) || []).length, 4);
  assert.equal((html.match(/expiry-panel-count">0/g) || []).length, 4);
  assert.ok(html.includes('id="expiry-thresholds-form"'));
  for (const [name, value] of [['urgentDays', 0], ['rapidReplacementDays', 30], ['anticipationDays', 90], ['monitoringDays', 180]]) assert.ok(html.includes(`name="${name}" min="0" step="1" inputmode="numeric" value="${value}"`));
  assert.ok(html.includes('Aucun lot enregistré'));
  assert.ok(html.includes('Les inventaires sont disponibles. Ajoutez les lots et les dates réellement présents'));
  for (const label of ['Commencer la saisie', 'Scanner ou rechercher un produit', 'Voir les inventaires']) assert.ok(html.includes(label));
  assert.equal(/prototype|démonstration|données de démonstration|lot de démonstration|action de démonstration/i.test(html), false);
});

test('un lot réel à vingt jours alimente le panneau orange et son filtre tactile', () => {
  const item = SMUR_CONTAINERS.find((container) => container.id === 'sac-vert-pedia').sections.find((section) => section.id.endsWith(':kit-perfusion')).items.find((candidate) => candidate.label.includes('NaCl 0,9 % 10 mL'));
  const state = expiryState({ lots: [{ id: 'lot-ui-20-days', itemId: item.id, lotNumber: 'LOT-UI-20', expiryDate: atDayOffset(20), quantity: 2, status: 'active', source: 'user-entry' }] });
  const html = renderApp(state, { ...expiryUi, expiryFilter: 'soon' }, ['expiry']);
  assert.ok(html.includes('class="expiry-panel orange is-active"'));
  assert.ok(html.includes('aria-pressed="true" aria-label="Filtrer : ≤ 30 jours, 1"'));
  assert.ok(html.includes('class="expiry-product-card orange"'));
  assert.ok(html.includes('LOT-UI-20'));
  assert.ok(html.includes('20 j restants'));
  assert.ok(html.includes('Sac vert n°1 — Pédia'));
});

test('la saisie reprend le vrai référentiel sans préremplir le stock vivant', () => {
  const item = SMUR_CONTAINERS.find((container) => container.id === 'sac-vert-pedia').sections.find((section) => section.id.endsWith(':kit-perfusion')).items.find((candidate) => candidate.label.includes('NaCl 0,9 % 10 mL'));
  const html = renderApp(expiryState(), { ...expiryUi, expirySearch: 'NaCl 0,9 % 10 mL', expiryItemId: item.id }, ['expiry', 'add']);
  assert.ok(html.includes('id="expiry-lot-form"'));
  assert.ok(html.includes('Sac vert n°1 — Pédia'));
  assert.ok(html.includes('Sac rouge · Kit perfusion'));
  assert.ok(html.includes('Organisation visuelle à préciser'));
  assert.ok(html.includes(`name="itemId" value="${item.id}"`));
  assert.ok(html.includes('Quantité théorique : 1'));
  assert.match(html, /name="lotNumber" required/);
  assert.match(html, /name="quantity" min="1" step="1" inputmode="numeric" required/);
  assert.equal(/name="lotNumber"[^>]+value=/i.test(html), false, 'aucun lot ne doit être généré ou suggéré');
});

test('le détail de lot expose Localiser, Retirer, Remplacer et Valider', () => {
  const item = SMUR_CONTAINERS.find((container) => container.id === 'sac-vert-pedia').sections.find((section) => section.id.endsWith(':kit-perfusion')).items.find((candidate) => candidate.label.includes('NaCl 0,9 % 10 mL'));
  const lot = { id: 'lot-ui-workflow', itemId: item.id, lotNumber: 'LOT-UI-FLOW', expiryDate: atDayOffset(20), quantity: 1, status: 'active', source: 'user-entry' };
  const action = { id: 'action-ui-workflow', lotId: lot.id, type: 'remplacement_peremption', status: 'in_progress', stage: 'verification', lines: [{ itemId: item.id, quantity: 1, done: true }], source: 'user-entry' };
  const html = renderApp(expiryState({ lots: [lot], actions: [action] }), expiryUi, ['expiry', 'lot', lot.id]);
  for (const title of ['Localiser', 'Retirer', 'Remplacer', 'Valider']) assert.ok(html.includes(`<h2>${title}</h2>`));
  assert.ok(html.includes('id="expiry-replacement-form"'));
  assert.ok(html.includes('Organisation visuelle à préciser'));
  assert.ok(html.includes('data-schema-kind="container"'));
});

test('un lot traité ce mois alimente le panneau vert et conserve son historique', () => {
  const item = SMUR_CONTAINERS[0].sections[0].items[0];
  const lot = { id: 'lot-ui-treated', itemId: item.id, lotNumber: 'LOT-UI-DONE', expiryDate: atDayOffset(-2), quantity: 1, status: 'replaced', replacedAt: new Date().toISOString(), source: 'user-entry' };
  const html = renderApp(expiryState({ lots: [lot] }), { ...expiryUi, expiryFilter: 'treated' }, ['expiry']);
  assert.ok(html.includes('class="expiry-panel green is-active"'));
  assert.ok(html.includes('Filtrer : Traité ce mois, 1'));
  assert.ok(html.includes('class="expiry-product-card green"'));
  assert.ok(html.includes('Historique conservé'));
});

test('les enregistrements synthétiques restent invisibles même avant migration', () => {
  const item = SMUR_CONTAINERS[0].sections[0].items[0];
  const state = expiryState({
    lots: [{ id: 'hidden-lot', itemId: item.id, lotNumber: 'HIDDEN-SEED', expiryDate: atDayOffset(5), quantity: 9, status: 'active', source: 'synthetic' }],
    actions: [{ id: 'hidden-action', title: 'HIDDEN-ACTION', status: 'open', source: 'example' }],
    events: [{ id: 'hidden-event', type: 'HIDDEN_EVENT', at: new Date().toISOString(), source: 'seed-demo' }]
  });
  const expiryHtml = renderApp(state, expiryUi, ['expiry']);
  const actionsHtml = renderApp(state, expiryUi, ['actions']);
  const historyHtml = renderApp(state, expiryUi, ['history']);
  assert.ok(expiryHtml.includes('Aucun lot enregistré'));
  assert.equal(expiryHtml.includes('HIDDEN-SEED'), false);
  assert.equal(actionsHtml.includes('HIDDEN-ACTION'), false);
  assert.equal(historyHtml.includes('HIDDEN_EVENT'), false);
});

test('la feuille de style impose une grille iPhone 2 × 2 et colore toute la surface', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.expiry-panel-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  for (const [tone, color] of [['red', '#b42318'], ['orange', '#c2410c'], ['violet', '#6d28d9'], ['green', '#137a42']]) {
    assert.ok(css.includes(`.expiry-panel.${tone} { background: ${color}; }`));
  }
  assert.match(css, /\.expiry-panel\s*\{[^}]*min-height:\s*138px/s);
});

