function slug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function flattenActiveChariotReference(chariotReference) {
  if (!Array.isArray(chariotReference?.references)) return [];
  return chariotReference.references.flatMap((reference) =>
    (reference.containers || []).flatMap((section) =>
      (section.items || []).map((item) => ({
        ...item,
        id: `xlsx:${item.id}`,
        rawItemId: item.id,
        productId: item.productId || `product:xlsx:${slug(item.label)}`,
        inventoryId: reference.id,
        containerId: reference.id,
        sectionId: section.id,
        containerLabel: reference.label,
        sectionLabel: section.label,
        category: item.category || 'non_determinee',
        expiryTracked: item.expiryTracked !== false,
        operationalUseAllowed: true,
        sourceId: item.sourceId || reference.sourceId,
        sourceReference: reference.documentRef || null,
        sourceRevision: reference.revision || null,
        sourceDate: reference.sourceDate || null,
        sourceStatus: item.sourceStatus || reference.sourceStatus || 'imported-from-source',
        physicalLayoutStatus: section.physicalLayoutStatus || reference.physicalLayoutStatus || 'physical-layout-provisional',
        referenceType: 'xlsx'
      }))
    )
  );
}

export function findActiveChariotItem(chariotReference, itemId) {
  return flattenActiveChariotReference(chariotReference).find((item) => item.id === itemId || item.rawItemId === itemId) || null;
}

export function findActiveChariotSection(chariotReference, inventoryId, sectionId) {
  const reference = chariotReference?.references?.find((candidate) => candidate.id === inventoryId);
  const section = reference?.containers?.find((candidate) => candidate.id === sectionId);
  return reference && section ? { reference, section } : null;
}
