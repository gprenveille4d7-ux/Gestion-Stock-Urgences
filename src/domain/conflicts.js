export const CONFLICT_POLICIES = Object.freeze({
  event: 'append_immutable',
  reference: 'coexist_by_version',
  action: 'controlled_merge',
  auditObservation: 'manual_review',
  lotExpiry: 'manual_review',
  comment: 'preserve_both'
});

export function resolveConflict(kind, localValue, remoteValue) {
  if (kind === 'event') {
    if (localValue.id === remoteValue.id) return { status: 'deduplicated', merged: localValue };
    return { status: 'merged', merged: [localValue, remoteValue] };
  }
  if (kind === 'reference') {
    if (localValue.version === remoteValue.version && JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
      return { status: 'review_required', reason: 'Même version de référentiel avec contenus différents', versions: [localValue, remoteValue] };
    }
    return { status: 'coexist', versions: [localValue, remoteValue] };
  }
  if (kind === 'action') {
    const bothDone = localValue.status === 'done' && remoteValue.status === 'done';
    if (bothDone) {
      return {
        status: 'merged',
        merged: {
          ...localValue,
          status: 'done',
          completedAt: [localValue.completedAt, remoteValue.completedAt].filter(Boolean).sort()[0] || null,
          completionEvents: [...new Set([localValue.completionEventId, remoteValue.completionEventId].filter(Boolean))]
        }
      };
    }
    if (localValue.status !== remoteValue.status) return { status: 'review_required', reason: "Transitions d'action concurrentes", versions: [localValue, remoteValue] };
    return { status: 'merged', merged: { ...localValue, ...remoteValue, updatedAt: [localValue.updatedAt, remoteValue.updatedAt].filter(Boolean).sort().at(-1) } };
  }
  if (kind === 'comment') return { status: 'merged', merged: [localValue, remoteValue] };
  if (['auditObservation', 'lotExpiry'].includes(kind)) {
    if (JSON.stringify(localValue) === JSON.stringify(remoteValue)) return { status: 'deduplicated', merged: localValue };
    return { status: 'review_required', reason: kind === 'lotExpiry' ? 'Dates ou lots concurrents' : 'Observations concurrentes', versions: [localValue, remoteValue] };
  }
  return { status: 'review_required', reason: 'Type de donnée sans politique', versions: [localValue, remoteValue] };
}

