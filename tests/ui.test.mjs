import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { OperationalStore } from '../src/application/operational-store.js';
import { SMUR_CONTAINERS } from '../src/data/reference.js';
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
    ['home'], ['return'], ['inventory'], ['actions'], ['action', store.state.actions[0].id], ['audits'], ['audit', audit.id],
    ['expiry'], ['defect'], ['map'], ['stats'], ['history'], ['profile']
  ];
  for (const route of routes) {
    const html = renderApp(store.state, ui, route);
    assert.ok(html.length > 1500, `${route.join('/')} trop court`);
    assert.equal(html.includes('>undefined<'), false, route.join('/'));
    assert.equal(html.includes('NaN'), false, route.join('/'));
    assert.ok(html.includes('class="app-shell"'), route.join('/'));
  }
  const returnHtml = renderApp(store.state, ui, ['return']);
  assert.ok(returnHtml.includes('Créer le réarmement ciblé'));
  assert.ok(returnHtml.includes('Le sac parent est déduit automatiquement'));
});

