import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { emergencyAmpouleCaseTransition, emergencyAmpouleCompartmentFocusPlacement, emergencyAmpouleItemPlacement } from '../src/features/emergency-ampoule-case/web.js';

const ROOT = new URL('../assets/sacs/sac-rouge/ampoulier/', import.meta.url);

test('le manifeste de l’ampoulier référence 40 visuels valides', async () => {
  const manifest = JSON.parse(await readFile(new URL('ampoulier-inventaire-confirme.json', ROOT), 'utf8'));
  const zones = manifest.zones.map((zone) => ({
    ...zone,
    items: zone.rows ? zone.rows.flatMap((row) => row.items || []) : zone.items || []
  }));
  const items = zones.flatMap((zone) => zone.items);
  const views = manifest.exploration.views;

  assert.equal(zones.length, 4);
  assert.equal(items.length, 40);
  assert.equal(new Set(items.map((item) => item.id)).size, 40);
  assert.deepEqual(views.map((view) => view.id), ['vue-generale', 'filet-gauche', 'filet-droit']);
  assert.deepEqual(views[0].zones, ['compartiment-gauche', 'compartiment-droit']);
  assert.equal(views[0].zones.some((zoneId) => zoneId.startsWith('filet-')), false);

  for (const view of views) {
    await access(new URL(view.asset.replace(/^\.\//, ''), ROOT));
    await access(new URL(view.previewAsset.replace(/^\.\//, ''), ROOT));
  }

  for (const item of items) {
    const position = item.position;
    assert.ok(position.x >= 0 && position.y >= 0, item.id);
    assert.ok(position.x + position.width <= 1536, item.id);
    assert.ok(position.y + position.height <= 1536, item.id);
    const relativeAsset = item.asset.replace(/^\.\//, '').replace(/^ampoulier\//, '');
    await access(new URL(relativeAsset, ROOT));
    if (item.viewId?.startsWith('filet-')) {
      assert.ok(item.focusPosition, item.id);
      assert.ok(item.focusPosition.x + item.focusPosition.width <= 820, item.id);
      assert.ok(item.focusPosition.y + item.focusPosition.height <= 1220, item.id);
    }
  }
});

test('la machine d’états sépare la vue générale, les zones et la sélection', () => {
  const closed = { mode: 'closed', zoneId: '', itemId: '' };
  const overview = emergencyAmpouleCaseTransition(closed, { type: 'OPEN' });
  const leftNet = emergencyAmpouleCaseTransition(overview, { type: 'VIEW', viewId: 'filet-gauche' });
  const selected = emergencyAmpouleCaseTransition(leftNet, { type: 'SELECT', itemId: 'lidocaine-200mg' });

  assert.deepEqual(overview, { mode: 'overview', zoneId: '', itemId: '' });
  assert.deepEqual(leftNet, { mode: 'zoneFocus', zoneId: 'filet-central-gauche', itemId: '' });
  assert.deepEqual(selected, { mode: 'itemSelected', zoneId: 'filet-central-gauche', itemId: 'lidocaine-200mg' });
  assert.deepEqual(emergencyAmpouleCaseTransition(selected, { type: 'BACK' }), leftNet);
  assert.deepEqual(emergencyAmpouleCaseTransition(leftNet, { type: 'BACK' }), overview);
  assert.deepEqual(emergencyAmpouleCaseTransition(overview, { type: 'BACK' }), closed);
});

test('une ampoule tournée conserve sa taille et son centre au lieu d’être comprimée', () => {
  const source = { x: 195, y: 265, width: 19, height: 92, rotation: 90 };
  const placement = emergencyAmpouleItemPlacement(source, { width: 1536, height: 1536 });

  assert.deepEqual(placement, {
    x: 158.5,
    y: 301.5,
    width: 92,
    height: 19,
    rotation: 90
  });
  assert.equal(placement.x + placement.width / 2, source.x + source.width / 2);
  assert.equal(placement.y + placement.height / 2, source.y + source.height / 2);
});

test('les traitements sont étalés au centre de chaque compartiment avec des marges', () => {
  const placement = { x: 0, y: 0, width: 92, height: 19, rotation: 90 };
  const leftCenters = [1, 2, 3, 4].map((orderFromLeft) => {
    const result = emergencyAmpouleCompartmentFocusPlacement(
      { zoneId: 'compartiment-gauche', orderFromLeft },
      placement,
      4
    );
    return result.x + result.width / 2;
  });
  const rightCenters = [1, 2, 3, 4].map((orderFromLeft) => {
    const result = emergencyAmpouleCompartmentFocusPlacement(
      { zoneId: 'compartiment-droit', orderFromLeft },
      placement,
      4
    );
    return result.x + result.width / 2;
  });

  assert.deepEqual(leftCenters, [216, 328, 440, 552]);
  assert.deepEqual(rightCenters, [984, 1096, 1208, 1320]);
  assert.equal(leftCenters[0], 768 - leftCenters.at(-1));
  assert.equal(rightCenters[0] - 768, 1536 - rightCenters.at(-1));
});

test('le rendu du module ne contient aucune liste permanente', async () => {
  const source = await readFile(new URL('../src/features/emergency-ampoule-case/web.js', import.meta.url), 'utf8');
  const stylesheet = await readFile(new URL('../src/features/emergency-ampoule-case/emergency-ampoule-case.css', import.meta.url), 'utf8');

  assert.equal(source.includes('renderZoneIndex'), false);
  assert.ok(source.includes("state.mode === 'overview'"));
  assert.ok(source.includes("manifest.zones.filter((zone) => zone.viewId === 'vue-generale')"));
  assert.ok(source.includes('focusPosition'));
  assert.ok(stylesheet.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(stylesheet.includes('env(safe-area-inset-bottom'));
  assert.ok(stylesheet.includes('--item-scale: 2'));
  assert.ok(stylesheet.includes('--item-scale: 1.75'));
  assert.ok(stylesheet.includes('aspect-ratio: 1 / 2'));
  assert.ok(stylesheet.includes('width: 200%'));
  assert.ok(stylesheet.includes('left: -100%'));
  assert.equal(stylesheet.includes('transform: scale(.88)'), false);
  assert.equal(stylesheet.includes('transform: scale(2.02)'), false);
  assert.ok(source.includes('is-compartment-item'));
  assert.ok(stylesheet.includes('rotate(var(--item-rotation))'));
});
