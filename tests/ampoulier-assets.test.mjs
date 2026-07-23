import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const ROOT = new URL('../assets/sacs/sac-rouge/ampoulier/', import.meta.url);

test('le manifeste de l’ampoulier référence 40 visuels valides', async () => {
  const manifest = JSON.parse(await readFile(new URL('ampoulier-inventaire-confirme.json', ROOT), 'utf8'));
  const zones = manifest.zones.map((zone) => ({
    ...zone,
    items: zone.rows ? zone.rows.flatMap((row) => row.items || []) : zone.items || []
  }));
  const items = zones.flatMap((zone) => zone.items);

  assert.equal(zones.length, 4);
  assert.equal(items.length, 40);
  assert.equal(new Set(items.map((item) => item.id)).size, 40);

  for (const item of items) {
    const position = item.position;
    assert.ok(position.x >= 0 && position.y >= 0, item.id);
    assert.ok(position.x + position.width <= 1536, item.id);
    assert.ok(position.y + position.height <= 1536, item.id);
    const relativeAsset = item.asset.replace(/^\.\//, '').replace(/^ampoulier\//, '');
    await access(new URL(relativeAsset, ROOT));
  }
});
