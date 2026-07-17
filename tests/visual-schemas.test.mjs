import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SMUR_CONTAINERS } from '../src/data/reference.js';
import { OPERATIONAL_ASSETS } from '../src/data/operational-assets.js';
import {
  CONTAINER_LAYOUT_OVERRIDES,
  RESERVE_ZONE_IDS,
  VISUAL_SCHEMA_DRAFTS,
  VISUAL_SCHEMA_META,
  VISUAL_SCHEMA_STATUS,
  VISUAL_SCHEMA_VERSION,
  getChariotDiagram,
  getContainerDiagram,
  getReserveDiagram
} from '../src/data/visual-schemas.js';

const chariotReference = JSON.parse(
  await readFile(new URL('../src/data/chariot-reference.json', import.meta.url), 'utf8')
);

function assertDeepFrozen(value, path = 'result') {
  if (!value || typeof value !== 'object') return;
  assert.equal(Object.isFrozen(value), true, path + ' doit être immuable');
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, path + '.' + key);
  }
}

function assertDiagramContract(diagram) {
  for (const field of ['id', 'entityId', 'viewKind', 'aspectRatio', 'minimumZoneWidthPercent', 'minimumZoneHeightPercent', 'image', 'status', 'version', 'zones']) {
    assert.ok(Object.hasOwn(diagram, field), diagram.id + ' sans champ ' + field);
  }
  assert.equal(diagram.version, VISUAL_SCHEMA_VERSION);
  assert.ok(Array.isArray(diagram.zones));

  const targets = new Set();
  for (const zone of diagram.zones) {
    for (const field of ['id', 'x', 'y', 'w', 'h', 'targetId', 'label', 'kind', 'order', 'status']) {
      assert.ok(Object.hasOwn(zone, field), diagram.id + ' : zone sans champ ' + field);
    }
    for (const coordinate of ['x', 'y', 'w', 'h']) {
      assert.equal(Number.isFinite(zone[coordinate]), true, diagram.id + ' : ' + coordinate + ' non numérique');
    }
    assert.ok(zone.x >= 0 && zone.x <= 100, diagram.id + ' : x hors limites');
    assert.ok(zone.y >= 0 && zone.y <= 100, diagram.id + ' : y hors limites');
    assert.ok(zone.w > 0 && zone.w <= 100, diagram.id + ' : largeur hors limites');
    assert.ok(zone.h > 0 && zone.h <= 100, diagram.id + ' : hauteur hors limites');
    assert.ok(zone.x + zone.w <= 100.001, diagram.id + ' : zone déborde horizontalement');
    assert.ok(zone.y + zone.h <= 100.001, diagram.id + ' : zone déborde verticalement');
    assert.ok(zone.w >= diagram.minimumZoneWidthPercent, diagram.id + ' : zone trop étroite pour le canevas');
    assert.ok(zone.h >= diagram.minimumZoneHeightPercent, diagram.id + ' : zone trop basse pour le canevas');
    assert.equal(typeof zone.targetId, 'string');
    assert.ok(zone.targetId.length > 0);
    assert.equal(typeof zone.id, 'string');
    assert.ok(zone.id.startsWith(diagram.id + ':zone:'));
    assert.equal(typeof zone.label, 'string');
    assert.ok(zone.label.length > 0);
    assert.equal(typeof zone.kind, 'string');
    assert.ok(zone.kind.length > 0);
    assert.equal(Number.isInteger(zone.order), true);
    assert.equal(typeof zone.status, 'string');
    assert.equal(targets.has(zone.targetId), false, diagram.id + ' : cible dupliquée ' + zone.targetId);
    targets.add(zone.targetId);
  }
  assertDeepFrozen(diagram, diagram.id);
}

test('le contrat visuel expose une version, un statut et des coordonnées en pourcentage', () => {
  assert.equal(VISUAL_SCHEMA_META.version, VISUAL_SCHEMA_VERSION);
  assert.equal(VISUAL_SCHEMA_META.status, VISUAL_SCHEMA_STATUS);
  assert.equal(VISUAL_SCHEMA_META.coordinateSystem, 'percentage');
  assert.equal(VISUAL_SCHEMA_META.minimumZoneWidthPercent, 15);
  assert.equal(VISUAL_SCHEMA_META.minimumZoneHeightPercent, 18);
  assertDeepFrozen(VISUAL_SCHEMA_META, 'VISUAL_SCHEMA_META');
  assertDeepFrozen(VISUAL_SCHEMA_DRAFTS, 'VISUAL_SCHEMA_DRAFTS');
  assertDeepFrozen(CONTAINER_LAYOUT_OVERRIDES, 'CONTAINER_LAYOUT_OVERRIDES');
  assertDeepFrozen(RESERVE_ZONE_IDS, 'RESERVE_ZONE_IDS');

  const container = SMUR_CONTAINERS.find((candidate) => candidate.id === 'sac-vert-pedia');
  const targetId = container.sections[0].id;
  const draft = {
    version: 'schema-local-2',
    status: 'draft-to-validate',
    image: { src: 'assets/photos/sac-vert-pedia-ouvert.webp', alt: 'Sac vert Pédia ouvert' },
    notes: ['Relevé à faire valider sur place.'],
    zones: {
      [targetId]: { x: 10, y: 12, w: 42, h: 28, label: 'Zone relevée', status: 'draft-to-validate', physical: true }
    }
  };
  const customized = getContainerDiagram(container, draft);
  const customizedZone = customized.zones.find((zone) => zone.targetId === targetId);
  assert.equal(customized.parentVersion, VISUAL_SCHEMA_VERSION);
  assert.equal(customized.version, 'schema-local-2');
  assert.equal(customized.image.src, draft.image.src);
  assert.equal(customized.notes.at(-1), draft.notes[0]);
  assert.deepEqual(
    [customizedZone.x, customizedZone.y, customizedZone.w, customizedZone.h],
    [10, 12, 42, 28]
  );
  assert.equal(customizedZone.label, 'Zone relevée');
  assert.equal(customizedZone.physical, false, 'un brouillon ne doit pas devenir un emplacement physique validé');
  assertDeepFrozen(customized, 'customized');

  const partlyValidated = getContainerDiagram(container, {
    version: 'schema-partiel-1',
    status: 'validated',
    zones: { [targetId]: { status: 'validated', physical: true } }
  });
  assert.equal(partlyValidated.status, 'physical-layout-provisional');
  assert.equal(partlyValidated.zones.find((zone) => zone.targetId === targetId).physical, true);

  const singleSectionContainer = SMUR_CONTAINERS.find((candidate) => candidate.sections.length === 1);
  const singleTargetId = singleSectionContainer.sections[0].id;
  const validated = getContainerDiagram(singleSectionContainer, {
    version: 'schema-valide-1',
    status: 'validated',
    zones: { [singleTargetId]: { status: 'validated', physical: true } }
  });
  assert.equal(validated.status, 'physical-layout-validated');
  assert.equal(validated.zones[0].physical, true);
  assert.throws(
    () => getContainerDiagram(container, { version: 'schema-invalide', zones: { inconnue: { x: 1 } } }),
    /Cible de brouillon inconnue/
  );
  assert.throws(
    () => getContainerDiagram(container, { version: 'schema-invalide', zones: { [targetId]: { x: 99, w: 10 } } }),
    /Coordonnées invalides/
  );
  assert.throws(
    () => getContainerDiagram(container, { version: 'schema-invalide', zones: { [targetId]: { x: 99, y: 82, w: 1, h: 18 } } }),
    /Dimensions minimales non respectées/
  );
  assert.throws(
    () => getContainerDiagram(container, { version: 'schema-invalide', notes: 'texte libre' }),
    /draft.notes doit être un tableau de chaînes/
  );
  assert.throws(
    () => getContainerDiagram(container, { version: 'schema-invalide', status: {} }),
    /draft.status doit être une chaîne non vide/
  );
  assert.throws(
    () => getContainerDiagram(container, { version: 'schema-invalide', zones: { [targetId]: 'coordonnées' } }),
    /doit être un objet/
  );
  assert.throws(
    () => getContainerDiagram(container, { version: 'schema-invalide', zones: { [targetId]: { status: { valide: false } } } }),
    /statut.*doit être une chaîne non vide/
  );
  assert.throws(
    () => getContainerDiagram(container, { version: 'schema-invalide', zones: { [targetId]: { label: 42 } } }),
    /libellé.*doit être une chaîne non vide/
  );
});

test('chaque section de chaque contenant SMUR possède exactement un hotspot', () => {
  assert.ok(SMUR_CONTAINERS.length > 0);
  let sectionCount = 0;
  let hotspotCount = 0;

  for (const container of SMUR_CONTAINERS) {
    const diagram = getContainerDiagram(container);
    assertDiagramContract(diagram);
    assert.equal(diagram.entityId, container.id);
    assert.equal(diagram.zones.length, container.sections.length);
    assert.deepEqual(
      diagram.zones.map((zone) => zone.targetId),
      container.sections.map((section) => section.id)
    );
    assert.deepEqual(
      diagram.zones.map((zone) => zone.itemCount),
      container.sections.map((section) => section.items.length)
    );
    assert.equal(
      diagram.layoutMode,
      container.id === 'valise-intra-osseuse' ? 'inventory-placeholder' : 'generated-grid'
    );
    assert.equal(diagram.image.src, null);
    assert.equal(diagram.image.status, 'physical-layout-provisional');
    assert.equal(diagram.minimumZoneHeightPercent, 18);
    sectionCount += container.sections.length;
    hotspotCount += diagram.zones.length;
  }

  assert.equal(hotspotCount, sectionCount);
});

test('les propositions Pédia et Respi restent désactivées sans source d’orientation validée', () => {
  const pedia = SMUR_CONTAINERS.find((container) => container.id === 'sac-vert-pedia');
  const respi = SMUR_CONTAINERS.find((container) => container.id === 'sac-bleu-respi');
  const pediaDiagram = getContainerDiagram(pedia);
  const respiDiagram = getContainerDiagram(respi);

  assert.equal(CONTAINER_LAYOUT_OVERRIDES['sac-vert-pedia'].enabled, false);
  assert.equal(CONTAINER_LAYOUT_OVERRIDES['sac-bleu-respi'].enabled, false);
  assert.equal(pediaDiagram.layoutMode, 'generated-grid');
  assert.equal(respiDiagram.layoutMode, 'generated-grid');
  assert.equal(pediaDiagram.status, 'physical-layout-provisional');
  assert.equal(respiDiagram.status, 'physical-layout-provisional');
  assert.ok(pediaDiagram.zones.every((zone) => zone.physical === false));
  assert.ok(respiDiagram.zones.every((zone) => zone.physical === false));
  assert.equal(
    pediaDiagram.zones.find((zone) => zone.label.includes('Kit perfusion')).kind,
    'kit'
  );
  assert.equal(
    respiDiagram.zones.find((zone) => zone.label.includes('latéral droit')).kind,
    'side-compartment'
  );

});

test('les trois références actives de chariots produisent un schéma complet', () => {
  assert.equal(chariotReference.references.length, 3);
  for (const reference of chariotReference.references) {
    const diagram = getChariotDiagram(reference);
    assertDiagramContract(diagram);
    assert.equal(diagram.entityId, reference.id);
    assert.equal(diagram.status, 'physical-layout-provisional');
    assert.equal(diagram.layoutMode, 'generated-section-index');
    assert.equal(diagram.minimumZoneHeightPercent, 12);
    assert.equal(diagram.zones.length, reference.containers.length);
    assert.deepEqual(
      diagram.zones.map((zone) => zone.targetId),
      reference.containers.map((container) => container.id)
    );
    assert.deepEqual(
      diagram.zones.map((zone) => zone.itemCount),
      reference.containers.map((container) => container.items.length)
    );
    assert.ok(diagram.zones.some((zone) => zone.kind === 'drawer'));
    assert.ok(diagram.zones.every((zone) => zone.physical === false));
  }
});

test('les réserves dérivent seulement les entités connues et ne valident aucun rangement inventé', () => {
  assert.deepEqual(
    [...RESERVE_ZONE_IDS],
    ['reserve-1', 'reserve-smur', 'reserve-respi']
  );

  for (const zoneId of RESERVE_ZONE_IDS) {
    const expectedTargetIds = [
      ...SMUR_CONTAINERS
        .filter((container) => container.stockZoneId === zoneId)
        .map((container) => container.id),
      ...OPERATIONAL_ASSETS
        .filter((asset) => asset.homeZoneId === zoneId)
        .map((asset) => asset.id)
    ];
    const diagram = getReserveDiagram(zoneId, SMUR_CONTAINERS, OPERATIONAL_ASSETS);
    assertDiagramContract(diagram);
    assert.equal(diagram.status, 'physical-layout-provisional');
    assert.equal(diagram.image.src, null);
    assert.equal(diagram.image.status, 'physical-layout-provisional');
    assert.equal(diagram.minimumZoneHeightPercent, diagram.aspectRatio === '3 / 4' ? 12 : 18);
    assert.deepEqual(
      Object.values(diagram.missingLocationLevels),
      Array(4).fill('physical-layout-provisional')
    );
    assert.deepEqual(
      diagram.zones.map((zone) => zone.targetId).sort(),
      expectedTargetIds.sort()
    );

    for (const zone of diagram.zones) {
      assert.equal(zone.status, 'physical-layout-provisional');
      assert.equal(zone.location.roomId, zoneId);
      assert.equal(zone.location.cabinet, null);
      assert.equal(zone.location.shelf, null);
      assert.equal(zone.location.bin, null);
      assert.equal(zone.location.status.includes('validated'), false);
      assert.equal(zone.status.includes('validated'), false);
    }
  }

  const reserveBase = getReserveDiagram('reserve-smur', SMUR_CONTAINERS, OPERATIONAL_ASSETS);
  const reserveTargetId = reserveBase.zones[0].targetId;
  const reserveDraft = getReserveDiagram('reserve-smur', SMUR_CONTAINERS, OPERATIONAL_ASSETS, {
    version: 'reserve-releve-1',
    status: 'physical-layout-provisional',
    zones: {
      [reserveTargetId]: {
        status: 'physical-layout-provisional',
        location: { roomId: 'reserve-smur', cabinet: 'ARMOIRE À CONFIRMER', shelf: null, bin: null }
      }
    }
  });
  const editedLocation = reserveDraft.zones.find((zone) => zone.targetId === reserveTargetId).location;
  assert.equal(editedLocation.roomId, 'reserve-smur');
  assert.equal(editedLocation.cabinet, 'ARMOIRE À CONFIRMER');
  assert.throws(
    () => getReserveDiagram('reserve-smur', SMUR_CONTAINERS, OPERATIONAL_ASSETS, {
      version: 'reserve-invalide',
      zones: { [reserveTargetId]: { location: { roomId: 'box-3' } } }
    }),
    /roomId ne peut pas changer/
  );
});

test('une réserve hors périmètre est refusée au lieu de produire une localisation fictive', () => {
  assert.throws(
    () => getReserveDiagram('reserve-inconnue', SMUR_CONTAINERS, OPERATIONAL_ASSETS),
    /Réserve inconnue/
  );
});
