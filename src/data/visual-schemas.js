export const VISUAL_SCHEMA_VERSION = '2026.07.1';
export const VISUAL_SCHEMA_STATUS = 'physical-layout-provisional';

export function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const GENERATED_STATUS = 'physical-layout-provisional';
const CONFIGURED_STATUS = 'physical-layout-provisional';
const HISTORICAL_STATUS = 'historical-reference-only';
const MISSING_STATUS = 'physical-layout-provisional';
const VALIDATED_STATUS = 'physical-layout-validated';

export const VISUAL_SCHEMA_META = deepFreeze({
  version: VISUAL_SCHEMA_VERSION,
  status: VISUAL_SCHEMA_STATUS,
  coordinateSystem: 'percentage',
  minimumZoneWidthPercent: 15,
  minimumZoneHeightPercent: 18,
  requiredZoneFields: ['id', 'x', 'y', 'w', 'h', 'targetId', 'label', 'kind', 'order', 'status']
});

// Points d'entrée volontairement vides pour de futurs brouillons administrés.
// Un brouillon peut aussi être passé directement aux fonctions get*Diagram,
// ce qui permet de le charger plus tard depuis IndexedDB ou une API sans
// modifier le composant d'interface.
export const VISUAL_SCHEMA_DRAFTS = deepFreeze({
  containers: {},
  chariots: {},
  reserves: {}
});

export const RESERVE_ZONE_IDS = deepFreeze(['reserve-1', 'reserve-smur', 'reserve-respi']);

// These layouts encode only relationships that are explicit in the section labels.
// If a label no longer matches exactly one rule, the whole container falls back to
// the neutral generated grid instead of presenting an invented physical layout.
export const CONTAINER_LAYOUT_OVERRIDES = deepFreeze({
  'sac-vert-pedia': {
    enabled: false,
    viewKind: 'bag-open',
    aspectRatio: '1 / 1',
    zones: [
      { key: 'ampoulier', includes: ['ampoulier'], x: 4, y: 4, w: 20, h: 20 },
      { key: 'kit-perfusion', includes: ['kit perfusion'], x: 28, y: 4, w: 20, h: 20 },
      { key: 'kit-paracetamol', includes: ['kit paracetamol'], x: 52, y: 4, w: 20, h: 20 },
      { key: 'kit-oxygene', includes: ['kit oxygene et aerosol'], x: 76, y: 4, w: 20, h: 20 },
      { key: 'face-a', includes: ['face a'], x: 26, y: 28, w: 22, h: 20 },
      { key: 'face-b', includes: ['face b'], x: 52, y: 28, w: 22, h: 20 },
      { key: 'intubation', includes: ['sac intubation'], x: 26, y: 52, w: 48, h: 20 },
      { key: 'lateral-droit', includes: ['lateral droit'], x: 78, y: 28, w: 18, h: 44 },
      { key: 'lateral-gauche', includes: ['lateral gauche'], x: 4, y: 28, w: 18, h: 44 },
      { key: 'fond', includes: ['fond du sac'], x: 4, y: 76, w: 44, h: 20 },
      { key: 'sac-bleu', includes: ['sac bleu interne'], x: 52, y: 76, w: 44, h: 20 }
    ]
  },
  'sac-bleu-respi': {
    enabled: false,
    viewKind: 'bag-open',
    aspectRatio: '1 / 1',
    zones: [
      { key: 'intubation-gauche', includes: ['intubation', 'gauche'], x: 4, y: 4, w: 28, h: 25 },
      { key: 'intubation-centre', includes: ['intubation', 'centre'], x: 36, y: 4, w: 28, h: 25 },
      { key: 'intubation-droite', includes: ['intubation', 'droite'], x: 68, y: 4, w: 28, h: 25 },
      { key: 'interne', includes: ['compartiment interne'], x: 24, y: 34, w: 52, h: 62 },
      { key: 'lateral-droit', includes: ['lateral droit'], x: 4, y: 34, w: 16, h: 62 },
      { key: 'lateral-gauche', includes: ['lateral gauche'], x: 80, y: 34, w: 16, h: 62 }
    ]
  }
});

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function roundCoordinate(value) {
  return Math.round(value * 1000) / 1000;
}

function gridLayout(count, {
  columns = count <= 1 ? 1 : count <= 4 ? 2 : 3,
  marginX = 5,
  marginY = 5,
  gapX = 3,
  gapY = 3
} = {}) {
  if (count === 0) return [];
  const effectiveColumns = Math.max(1, Math.min(columns, count));
  const rows = Math.ceil(count / effectiveColumns);
  const width = (100 - (2 * marginX) - ((effectiveColumns - 1) * gapX)) / effectiveColumns;
  const height = (100 - (2 * marginY) - ((rows - 1) * gapY)) / rows;
  return Array.from({ length: count }, (_, index) => {
    const column = index % effectiveColumns;
    const row = Math.floor(index / effectiveColumns);
    return {
      x: roundCoordinate(marginX + (column * (width + gapX))),
      y: roundCoordinate(marginY + (row * (height + gapY))),
      w: roundCoordinate(width),
      h: roundCoordinate(height)
    };
  });
}

function missingImage(label) {
  return {
    src: null,
    alt: 'Organisation visuelle à préciser — ' + label,
    status: MISSING_STATUS
  };
}

function sectionKind(label) {
  const normalized = normalizeLabel(label);
  if (normalized.startsWith('inventaire source') || normalized.includes('rangement non documente')) return 'inventory-group';
  if (normalized.includes('kit ') || normalized.startsWith('kit')) return 'kit';
  if (normalized.includes('pochette') || normalized.includes('ampoulier')) return 'pocket';
  if (normalized.includes('face ') || normalized.includes('plaque')) return 'panel';
  if (normalized.includes('lateral')) return 'side-compartment';
  if (normalized.includes('fond')) return 'base-compartment';
  if (normalized.includes('sac ')) return 'inner-bag';
  return 'compartment';
}

function chariotSectionKind(label) {
  const normalized = normalizeLabel(label);
  if (normalized.includes('tiroir')) return 'drawer';
  if (normalized.includes('plateau')) return 'top-tray';
  return 'storage-section';
}

function requireEntity(entity, collectionKey, entityLabel) {
  if (!entity || typeof entity !== 'object' || !entity.id) {
    throw new TypeError(entityLabel + ' invalide');
  }
  if (!Array.isArray(entity[collectionKey])) {
    throw new TypeError(entityLabel + '.' + collectionKey + ' doit être un tableau');
  }
}

function assertUniqueTargets(zones, diagramId) {
  const targets = zones.map((zone) => zone.targetId);
  if (new Set(targets).size !== targets.length) {
    throw new Error('Cibles dupliquées dans le schéma ' + diagramId);
  }
}

function mergeDraftZone(zone, draft, diagram) {
  if (!draft) return zone;
  const diagramId = diagram.id;
  if (draft.status !== undefined && (typeof draft.status !== 'string' || !draft.status.trim())) throw new TypeError('Le statut de ' + zone.targetId + ' doit être une chaîne non vide');
  if (draft.label !== undefined && (typeof draft.label !== 'string' || !draft.label.trim())) throw new TypeError('Le libellé de ' + zone.targetId + ' doit être une chaîne non vide');
  if (draft.physical !== undefined && typeof draft.physical !== 'boolean') throw new TypeError('physical doit être booléen pour ' + zone.targetId);
  if (draft.location !== undefined) {
    if (!draft.location || typeof draft.location !== 'object' || Array.isArray(draft.location)) throw new TypeError('location doit être un objet pour ' + zone.targetId);
    if (!zone.location) throw new RangeError('La cible ' + zone.targetId + ' ne possède pas de localisation éditable');
    const allowedLocationFields = new Set(['roomId', 'cabinet', 'shelf', 'bin']);
    const unknownLocationField = Object.keys(draft.location).find((field) => !allowedLocationFields.has(field));
    if (unknownLocationField) throw new RangeError('Niveau de localisation inconnu pour ' + zone.targetId + ' : ' + unknownLocationField);
    if (draft.location.roomId !== undefined && draft.location.roomId !== zone.location.roomId) throw new RangeError('roomId ne peut pas changer dans le schéma ' + diagramId);
    for (const field of ['cabinet', 'shelf', 'bin']) {
      const value = draft.location[field];
      if (value !== undefined && value !== null && (typeof value !== 'string' || !value.trim())) throw new TypeError(field + ' doit être une chaîne non vide ou null pour ' + zone.targetId);
    }
  }
  const geometry = {};
  for (const field of ['x', 'y', 'w', 'h']) {
    if (draft[field] !== undefined) geometry[field] = Number(draft[field]);
  }
  const normalizedStatus = draft.status === 'validated' ? VALIDATED_STATUS : (draft.status || zone.status);
  const merged = {
    ...zone,
    ...geometry,
    label: draft.label || zone.label,
    status: normalizedStatus,
    physical: ['validated', VALIDATED_STATUS].includes(draft.status) && draft.physical === true,
    location: zone.location ? { ...zone.location, ...(draft.location || {}), roomId: zone.location.roomId, status: normalizedStatus || zone.location.status } : zone.location
  };
  if (![merged.x, merged.y, merged.w, merged.h].every(Number.isFinite) || merged.x < 0 || merged.y < 0 || merged.w <= 0 || merged.h <= 0 || merged.x + merged.w > 100.001 || merged.y + merged.h > 100.001) {
    throw new RangeError('Coordonnées invalides pour ' + zone.targetId + ' dans ' + diagramId);
  }
  const minimumWidth = diagram.minimumZoneWidthPercent || VISUAL_SCHEMA_META.minimumZoneWidthPercent;
  const minimumHeight = diagram.minimumZoneHeightPercent || VISUAL_SCHEMA_META.minimumZoneHeightPercent;
  if (Object.keys(geometry).length && (merged.w < minimumWidth || merged.h < minimumHeight)) {
    throw new RangeError('Dimensions minimales non respectées pour ' + zone.targetId + ' dans ' + diagramId);
  }
  return merged;
}

export function applyVisualSchemaDraft(diagram, draft = null) {
  if (!draft) return deepFreeze(diagram);
  if (!draft.version || typeof draft.version !== 'string' || !draft.version.trim()) throw new TypeError('Le brouillon de schéma doit posséder une version');
  if (draft.status !== undefined && (typeof draft.status !== 'string' || !draft.status.trim())) throw new TypeError('draft.status doit être une chaîne non vide');
  if (draft.zones && (typeof draft.zones !== 'object' || Array.isArray(draft.zones))) throw new TypeError('draft.zones doit être un objet indexé par targetId');
  if (draft.notes && (!Array.isArray(draft.notes) || draft.notes.some((note) => typeof note !== 'string'))) throw new TypeError('draft.notes doit être un tableau de chaînes');
  if (draft.image !== undefined && (!draft.image || typeof draft.image !== 'object' || Array.isArray(draft.image))) throw new TypeError('draft.image doit être un objet');
  if (draft.image?.src && typeof draft.image.src !== 'string') throw new TypeError('draft.image.src doit être une chaîne');
  if (draft.image?.alt !== undefined && typeof draft.image.alt !== 'string') throw new TypeError('draft.image.alt doit être une chaîne');
  const zoneDrafts = draft.zones || {};
  const knownTargets = new Set(diagram.zones.map((zone) => zone.targetId));
  for (const targetId of Object.keys(zoneDrafts)) {
    if (!knownTargets.has(targetId)) throw new RangeError('Cible de brouillon inconnue : ' + targetId);
    if (!zoneDrafts[targetId] || typeof zoneDrafts[targetId] !== 'object' || Array.isArray(zoneDrafts[targetId])) throw new TypeError('La zone de brouillon ' + targetId + ' doit être un objet');
  }
  const image = draft.image?.src ? {
    src: draft.image.src,
    alt: draft.image.alt || diagram.image?.alt || diagram.label,
    status: draft.status === 'validated' ? VALIDATED_STATUS : (draft.status || VISUAL_SCHEMA_STATUS)
  } : diagram.image;
  const zones = diagram.zones.map((zone) => mergeDraftZone(zone, zoneDrafts[zone.targetId], diagram));
  const requestedStatus = draft.status === 'validated' ? VALIDATED_STATUS : (draft.status || VISUAL_SCHEMA_STATUS);
  const status = requestedStatus === VALIDATED_STATUS && (!zones.length || !zones.every((zone) => zone.status === VALIDATED_STATUS))
    ? VISUAL_SCHEMA_STATUS
    : requestedStatus;
  return deepFreeze({
    ...diagram,
    parentVersion: diagram.version,
    version: draft.version,
    status,
    image,
    notes: Object.freeze([...(diagram.notes || []), ...(draft.notes || [])]),
    zones
  });
}

function semanticLayoutFor(container) {
  const override = CONTAINER_LAYOUT_OVERRIDES[container.id];
  if (!override?.enabled) return null;

  const usedRules = new Set();
  const geometries = container.sections.map((section) => {
    const label = normalizeLabel(section.label);
    const matches = override.zones.filter((rule) =>
      rule.includes.every((fragment) => label.includes(fragment))
    );
    if (matches.length !== 1 || usedRules.has(matches[0].key)) return null;
    usedRules.add(matches[0].key);
    const { x, y, w, h } = matches[0];
    return { x, y, w, h };
  });

  if (geometries.some((geometry) => geometry === null)) return null;
  return {
    viewKind: override.viewKind,
    aspectRatio: override.aspectRatio,
    geometries
  };
}

export function getContainerDiagram(container, draft = VISUAL_SCHEMA_DRAFTS.containers[container?.id] || null) {
  requireEntity(container, 'sections', 'Contenant');
  const semanticLayout = semanticLayoutFor(container);
  const geometries = semanticLayout?.geometries || gridLayout(container.sections.length);
  const layoutStatus = semanticLayout ? CONFIGURED_STATUS : GENERATED_STATUS;
  const id = 'visual-schema:container:' + container.id;
  const inventoryOnly = container.sections.every((section) => sectionKind(section.label) === 'inventory-group');
  const zones = container.sections.map((section, order) => {
    const kind = sectionKind(section.label);
    return {
      ...geometries[order],
      id: id + ':zone:' + section.id,
      targetId: section.id,
      label: section.label,
      itemCount: section.items.length,
      kind,
      physical: Boolean(semanticLayout) && kind !== 'inventory-group',
      order,
      status: layoutStatus
    };
  });
  assertUniqueTargets(zones, id);

  return applyVisualSchemaDraft({
    id,
    entityId: container.id,
    kind: 'container',
    label: container.label,
    color: container.color,
    referenceSourceId: container.sourceId,
    viewKind: semanticLayout?.viewKind || (inventoryOnly ? 'inventory-placeholder' : 'functional-overview'),
    aspectRatio: semanticLayout?.aspectRatio || '4 / 3',
    minimumZoneWidthPercent: VISUAL_SCHEMA_META.minimumZoneWidthPercent,
    minimumZoneHeightPercent: VISUAL_SCHEMA_META.minimumZoneHeightPercent,
    image: missingImage(container.label),
    status: layoutStatus,
    version: VISUAL_SCHEMA_VERSION,
    layoutMode: semanticLayout ? 'semantic-override' : inventoryOnly ? 'inventory-placeholder' : 'generated-grid',
    zones
  }, draft);
}

export function getChariotDiagram(reference, draft = VISUAL_SCHEMA_DRAFTS.chariots[reference?.id] || null) {
  requireEntity(reference, 'containers', 'Référence chariot');
  const id = 'visual-schema:chariot:' + reference.id;
  const geometries = gridLayout(reference.containers.length, {
    columns: 2,
    marginX: 8,
    marginY: 5,
    gapX: 0,
    gapY: 2
  });
  const status = reference.sourceStatus === HISTORICAL_STATUS
    ? HISTORICAL_STATUS
    : GENERATED_STATUS;
  const zones = reference.containers.map((container, order) => ({
    ...geometries[order],
    id: id + ':zone:' + container.id,
    targetId: container.id,
    label: container.label,
    itemCount: container.items.length,
    kind: chariotSectionKind(container.label),
    physical: false,
    order,
    status
  }));
  assertUniqueTargets(zones, id);

  return applyVisualSchemaDraft({
    id,
    entityId: reference.id,
    kind: 'chariot',
    label: reference.label,
    referenceSourceId: reference.id,
    viewKind: 'chariot-index',
    aspectRatio: '3 / 4',
    minimumZoneWidthPercent: VISUAL_SCHEMA_META.minimumZoneWidthPercent,
    minimumZoneHeightPercent: 12,
    image: missingImage(reference.label),
    status,
    version: VISUAL_SCHEMA_VERSION,
    layoutMode: 'generated-section-index',
    zones
  }, draft);
}

export function getReserveDiagram(zoneId, containers = [], assets = [], draft = VISUAL_SCHEMA_DRAFTS.reserves[zoneId] || null) {
  if (!RESERVE_ZONE_IDS.includes(zoneId)) {
    throw new RangeError('Réserve inconnue : ' + zoneId);
  }
  if (!Array.isArray(containers) || !Array.isArray(assets)) {
    throw new TypeError('Les contenants et assets doivent être des tableaux');
  }

  const knownEntities = [
    ...containers
      .filter((container) => container.stockZoneId === zoneId)
      .map((container) => ({
        id: container.id,
        label: container.label,
        kind: container.kind || 'container',
        sourceStatus: container.sourceStatus || null,
        locationStatus: container.stockZoneStatus || MISSING_STATUS
      })),
    ...assets
      .filter((asset) => asset.homeZoneId === zoneId)
      .map((asset) => ({
        id: asset.id,
        label: asset.label,
        kind: asset.type || 'asset',
        sourceStatus: asset.sourceStatus || null,
        locationStatus: asset.sourceStatus || MISSING_STATUS
      }))
  ];
  const id = 'visual-schema:reserve:' + zoneId;
  const geometries = gridLayout(knownEntities.length, { columns: 2, marginX: 6, marginY: 8 });
  const zones = knownEntities.map((entity, order) => ({
    ...geometries[order],
    id: id + ':zone:' + entity.id,
    targetId: entity.id,
    label: entity.label,
    kind: entity.kind,
    physical: false,
    order,
    status: MISSING_STATUS,
    sourceStatus: entity.sourceStatus,
    location: {
      roomId: zoneId,
      cabinet: null,
      shelf: null,
      bin: null,
      status: entity.locationStatus || MISSING_STATUS
    }
  }));
  assertUniqueTargets(zones, id);

  return applyVisualSchemaDraft({
    id,
    entityId: zoneId,
    kind: 'reserve',
    label: zoneId,
    referenceSourceId: null,
    viewKind: 'reserve-contents-index',
    aspectRatio: knownEntities.length > 6 ? '3 / 4' : '4 / 3',
    minimumZoneWidthPercent: VISUAL_SCHEMA_META.minimumZoneWidthPercent,
    minimumZoneHeightPercent: knownEntities.length > 6 ? 12 : VISUAL_SCHEMA_META.minimumZoneHeightPercent,
    image: missingImage(zoneId),
    status: MISSING_STATUS,
    version: VISUAL_SCHEMA_VERSION,
    layoutMode: 'known-room-only',
    missingLocationLevels: {
      photo: MISSING_STATUS,
      cabinets: MISSING_STATUS,
      shelves: MISSING_STATUS,
      bins: MISSING_STATUS
    },
    zones
  }, draft);
}
