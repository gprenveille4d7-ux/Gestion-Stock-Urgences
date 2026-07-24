import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { renderReserve01KitsHost } from '../src/features/reserve-01-kits/web.js';

const ROOT = new URL('../assets/chariot-urgences/reserve-01-kits/', import.meta.url);

async function loadInventory() {
  return JSON.parse(await readFile(new URL('reserve-01-kits-inventaire.json', ROOT), 'utf8'));
}

function localAssetUrl(path) {
  return new URL(String(path).replace(/^\.\//, '').replace(/^reserve-01-kits\//, ''), ROOT);
}

test('la Réserve 1 conserve dix caisses distinctes et 323 occurrences', async () => {
  const inventory = await loadInventory();
  const items = inventory.kits.flatMap((kit) => kit.items);

  assert.equal(inventory.kits.length, 10);
  assert.equal(items.length, 323);
  assert.equal(new Set(items.map((item) => item.id)).size, 323);
  assert.equal(new Set(items.map((item) => item.assetId)).size, 152);
  assert.equal(inventory.itemAssetStats.uniqueVisualAssetCount, 152);
  assert.equal(inventory.kits.find((kit) => kit.id === 'kit-drain-thoracique-1').items.length, 45);
  assert.equal(inventory.kits.find((kit) => kit.id === 'kit-drain-thoracique-2').items.length, 45);
  assert.notDeepEqual(
    inventory.kits.find((kit) => kit.id === 'kit-drain-thoracique-1').items,
    inventory.kits.find((kit) => kit.id === 'kit-drain-thoracique-2').items
  );
});

test('tous les assets déclarés existent et les points tactiles restent dans la vue', async () => {
  const inventory = await loadInventory();
  await access(localAssetUrl(inventory.roomAsset));
  await access(localAssetUrl(inventory.roomPreviewAsset));

  for (const kit of inventory.kits) {
    await access(localAssetUrl(kit.asset));
    assert.ok(kit.roomHotspot.xPercent >= 0 && kit.roomHotspot.yPercent >= 0, kit.id);
    assert.ok(kit.roomHotspot.xPercent + kit.roomHotspot.widthPercent <= 100, kit.id);
    assert.ok(kit.roomHotspot.yPercent + kit.roomHotspot.heightPercent <= 100, kit.id);
    for (const item of kit.items) {
      assert.ok(item.assetId, item.id);
      await access(localAssetUrl(item.asset));
    }
  }
});

test('la route encode les trois états réserve, caisse et matériel', async () => {
  const inventory = await loadInventory();
  const kit = inventory.kits[0];
  const item = kit.items[0];
  const overview = renderReserve01KitsHost();
  const focused = renderReserve01KitsHost(kit.id);
  const selected = renderReserve01KitsHost(kit.id, item.id);
  const source = await readFile(new URL('../src/features/reserve-01-kits/web.js', import.meta.url), 'utf8');

  assert.ok(overview.includes('data-kit-id=""'));
  assert.ok(focused.includes(`data-kit-id="${kit.id}"`));
  assert.ok(selected.includes(`data-item-id="${item.id}"`));
  for (const state of ['reserveOverview', 'kitFocused', 'itemSelected']) assert.ok(source.includes(state));
  assert.ok(source.includes("alert.startsWith('#')"));
  assert.ok(source.includes('/^\\*+$/'));
});

test('le parcours accueil, Matériel et hors ligne référence le module', async () => {
  const views = await readFile(new URL('../src/ui/views.js', import.meta.url), 'utf8');
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const serviceWorker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const stylesheet = await readFile(new URL('../src/features/reserve-01-kits/reserve-01-kits.css', import.meta.url), 'utf8');

  assert.ok(views.includes("'reserve/reserve-1', 'map', 'Les Réserves'"));
  assert.ok(views.includes("'reserve/reserve-01-kits', 'map', 'Réserve 1 · Kits d’urgence'"));
  assert.ok(views.includes('data-nav="reserve/reserve-01-kits"'));
  assert.ok(views.includes("id === 'reserve-01-kits'"));
  assert.ok(main.includes('mountReserve01Kits'));
  for (const asset of [
    'reserve-01-kits-inventaire.json',
    'reserve-01-entree-etagere-droite.png',
    'reserve-01-kits-compose.png',
    'items/caisse-drain-thoracique-1.png',
    'src/features/reserve-01-kits/web.js'
  ]) assert.ok(serviceWorker.includes(asset), asset);
  for (const rule of [
    'env(safe-area-inset-bottom)',
    '@media (prefers-reduced-motion: reduce)',
    'data-snap="preview"',
    'data-snap="full"',
    'aspect-ratio: 1536 / 1024',
    'height: 54dvh'
  ]) assert.ok(stylesheet.includes(rule), rule);
});
