import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SMUR_CONTAINERS } from '../src/data/reference.js';
import { bagExplorerSelection, bagExplorerViewIndex, normalizeBagExplorerIndex, renderBagExplorer } from '../src/ui/bag-explorer.js';
import { renderApp } from '../src/ui/views.js';

const catalog = JSON.parse(await readFile(new URL('../src/data/bag-explorers.json', import.meta.url), 'utf8'));
const container = SMUR_CONTAINERS.find((candidate) => candidate.id === 'sac-rouge-solutes');
const config = catalog.explorers[container.id];

test('la configuration du sac rouge suit les neuf vues physiques demandées', () => {
  assert.equal(config.views.length, 9);
  assert.deepEqual(config.views.map((view) => view.id), ['closed', 'removable-red', 'central-a', 'central-b', 'ampoule-left', 'ampoule-right', 'ampoule-inside', 'right-side', 'left-side']);
  assert.deepEqual(config.views.map((view, index) => bagExplorerSelection(container, config, index).sections.reduce((sum, section) => sum + section.items.length, 0)), [0, 16, 10, 9, 16, 13, 10, 7, 0]);
  assert.equal(bagExplorerViewIndex(config, 'sac-rouge-solutes:plaque-a'), 2);
});

test('la navigation de l’explorateur est circulaire dans les deux sens', () => {
  assert.equal(normalizeBagExplorerIndex(9, 9), 0);
  assert.equal(normalizeBagExplorerIndex(-1, 9), 8);
  assert.equal(normalizeBagExplorerIndex(19, 9), 1);
});

test('seules les données de la vue active sont rendues', () => {
  const faceA = renderBagExplorer(container, config, { index: 2 });
  assert.equal((faceA.match(/class="inventory-line bag-explorer-reveal"/g) || []).length, 10);
  assert.ok(faceA.includes('Cathéter gris 16 G'));
  assert.equal(faceA.includes('Dobutamine'), false);
  assert.equal((faceA.match(/role="tab"/g) || []).length, 9);

  const leftSide = renderBagExplorer(container, config, { index: 8 });
  assert.ok(leftSide.includes('Emplacement prévu pour un contenu futur.'));
  assert.equal(leftSide.includes('class="inventory-line'), false);

  for (let index = 0; index < config.views.length; index += 1) {
    const html = renderBagExplorer(container, config, { index });
    assert.equal(html.includes('undefined'), false, config.views[index].id);
    assert.equal(html.includes('NaN'), false, config.views[index].id);
  }
});

test('les interactions utilisent un geste unifié et des animations compositées', async () => {
  const [mainSource, styles] = await Promise.all([
    readFile(new URL('../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);
  for (const eventName of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) assert.ok(mainSource.includes(`'${eventName}'`));
  assert.ok(styles.includes('touch-action: pan-y'));
  assert.ok(styles.includes('will-change: transform, opacity'));
  assert.ok(styles.includes('250ms'));
  assert.ok(styles.includes('@media (prefers-reduced-motion: reduce)'));
});

test('le détail existant active l’explorateur sans changer de route', () => {
  const state = {
    ready: true, persistent: true, reference: {}, chariotReference: null,
    user: { id: 'local-user', displayName: 'Utilisateur local', role: 'soignant' },
    users: [], events: [], audits: [], observations: [], anomalies: [], actions: [], lots: [], outbox: [], metadata: [], settings: [],
    sync: { status: 'local-only', pending: 0, sent: 0 }
  };
  const ui = {
    online: true, search: '', usageContainer: '', usageSection: '', usageItem: '', usageDeclaration: 'ouvert',
    actionFilter: 'open', expiryFilter: 'all', expirySearch: '', expiryItemId: '', defectContainer: 'sac-bleu-respi', mapOrigin: 'pc-ide', mapZoom: 1,
    bagExplorerCatalog: catalog, bagExplorerIndexes: Object.create(null), bagExplorerDirections: Object.create(null)
  };
  const html = renderApp(state, ui, ['container', container.id, 'plaque-a']);
  assert.ok(html.includes(`data-bag-explorer="${container.id}"`));
  assert.ok(html.includes('data-view-index="2"'));
  assert.ok(html.includes('data-view-count="9"'));
  assert.ok(html.includes(`data-return-section="${container.id}:plaque-a"`));
  assert.equal(html.includes('class="visual-schema"'), false);
});
