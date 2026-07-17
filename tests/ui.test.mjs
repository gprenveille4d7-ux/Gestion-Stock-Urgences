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
  const ui = {
    online: false,
    search: 'adrénaline',
    usageContainer: 'sac-vert-pedia',
    usageSection: section.id,
    usageItem: section.items[0].id,
    usageDeclaration: 'utilise',
    actionFilter: 'open',
    expiryHorizon: 90,
    defectContainer: 'sac-bleu-respi',
    mapOrigin: 'pc-ide',
    mapZoom: 1.25
  };
  const routes = [
    ['home'], ['return'], ['inventory'], ['container', 'sac-vert-pedia'], ['container', 'sac-vert-pedia', 'kit-perfusion'],
    ['reserve', 'reserve-smur'], ['chariot', 'chariot-pediatrique'], ['actions'], ['action', store.state.actions[0].id], ['audits'], ['audit', audit.id],
    ['expiry'], ['defect'], ['map'], ['stats'], ['history'], ['profile']
  ];
  for (const route of routes) {
    const html = renderApp(store.state, ui, route);
    assert.ok(html.length > 1500, `${route.join('/')} trop court`);
    assert.equal(html.includes('>undefined<'), false, route.join('/'));
    assert.equal(html.includes('NaN'), false, route.join('/'));
    assert.ok(html.includes('class="app-shell"'), route.join('/'));
    assert.ok(html.includes('class="page-title" tabindex="-1"'), route.join('/'));
    assert.ok(html.includes('role="status" aria-live="polite"'), route.join('/'));
  }

  for (const container of SMUR_CONTAINERS) {
    const overview = renderApp(store.state, { ...ui, search: '' }, ['container', container.id]);
    assert.ok(overview.includes(`data-schema-kind="container"`), container.id);
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
  assert.ok(validatedDiagramHtml.includes('Implantation validée'));
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

  const inventoryHtml = renderApp(store.state, { ...ui, search: '' }, ['inventory']);
  assert.ok(inventoryHtml.includes('Sacs et contenants SMUR'));
  assert.ok(inventoryHtml.includes('Chariots historiques'));
  assert.ok(inventoryHtml.includes('Réserves'));
  assert.ok(inventoryHtml.includes('718 lignes issues de 16 inventaires'));
  assert.ok(inventoryHtml.includes('class="schema-thumbnail"'));
  assert.ok(inventoryHtml.includes('aria-hidden="true"'));
  const actionListHtml = renderApp(store.state, ui, ['actions']);
  assert.ok(actionListHtml.includes('DÉMO'));
  const demoActionHtml = renderApp(store.state, ui, ['action', 'action-demo-biseptine']);
  assert.ok(demoActionHtml.includes('Étape bloquée · emplacement à confirmer'));
  const mapHtml = renderApp(store.state, ui, ['map']);
  assert.ok(mapHtml.includes('sans emplacement opérationnel validé'));
  const searchedInventoryHtml = renderApp(store.state, { ...ui, search: 'adrénaline' }, ['inventory']);
  assert.ok(searchedInventoryHtml.includes('affectation de zone à confirmer'));

  const containerHtml = renderApp(store.state, ui, ['container', 'sac-vert-pedia']);
  assert.ok(containerHtml.includes('affectation proposée : Réserve SMUR · à confirmer'));

  const reserveHtml = renderApp(store.state, ui, ['reserve', 'reserve-1']);
  assert.ok(reserveHtml.includes('PHOTO DE LA RÉSERVE À AJOUTER'));
  assert.ok(reserveHtml.includes('Les armoires, étagères et bacs ne sont pas inventés'));

  const degradedState = { ...store.state, chariotReference: null };
  const degradedInventory = renderApp(degradedState, { ...ui, search: '' }, ['inventory']);
  assert.ok(degradedInventory.includes('361 lignes issues de 13 inventaires chargés'));
  assert.ok(degradedInventory.includes('Référentiel chariots indisponible'));
  const degradedProfile = renderApp(degradedState, ui, ['profile']);
  assert.ok(degradedProfile.includes('0/3 classeurs historiques chargés'));
});

