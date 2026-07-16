export function computeStatistics(state) {
  const events = state.events || [];
  const actions = state.actions || [];
  const audits = state.audits || [];
  const doneActions = actions.filter((action) => action.status === 'done');
  const durations = doneActions
    .map((action) => (new Date(action.completedAt).getTime() - new Date(action.createdAt).getTime()) / 60000)
    .filter((value) => Number.isFinite(value) && value >= 0);
  return {
    totalEvents: events.length,
    openActions: actions.filter((action) => !['done', 'cancelled'].includes(action.status)).length,
    completedActions: doneActions.length,
    completedAudits: audits.filter((audit) => audit.status === 'completed').length,
    averageResolutionMinutes: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null,
    returns: events.filter((event) => ['USAGE_DECLARED', 'ITEM_USAGE_DECLARED', 'ITEM_MISSING_DECLARED'].includes(event.type)).length,
    normalUsage: events.filter((event) => event.type === 'ITEM_USAGE_DECLARED').length,
    conformityAnomalies: events.filter((event) => event.type === 'ITEM_MISSING_DECLARED' || (event.type === 'AUDIT_OBSERVATION_RECORDED' && ['manquant', 'quantite_incorrecte', 'perime'].includes(event.payload?.result))).length,
    failures: events.filter((event) => event.type === 'DEFECT_REPORTED' || (event.type === 'AUDIT_OBSERVATION_RECORDED' && event.payload?.result === 'defectueux')).length,
    restocksCompleted: events.filter((event) => event.type === 'ACTION_COMPLETED' && event.payload?.actionType === 'rearmement').length,
    expiryReplacementsCompleted: events.filter((event) => event.type === 'EXPIRY_REPLACED').length,
    interruptions: events.filter((event) => event.type === 'AUDIT_PAUSED').length,
    resumptions: events.filter((event) => event.type === 'AUDIT_RESUMED').length
  };
}
