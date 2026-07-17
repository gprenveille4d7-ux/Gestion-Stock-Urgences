import { ACTION_TYPES } from '../config.js';
import { createId } from './ids.js';
import { computePriority } from './priority.js';

function actionForObservation(event, context) {
  const result = event.payload.result;
  if (['conforme', 'non_applicable'].includes(result)) return { anomalies: [], actions: [] };
  const type = result === 'defectueux' ? ACTION_TYPES.REPAIR : result === 'perime' ? ACTION_TYPES.REPLACE_EXPIRY : ACTION_TYPES.RESTOCK;
  const severity = event.payload.severity === 'bloquant' ? 'bloquant' : 'attention';
  const anomalyId = createId('anomaly');
  const anomaly = {
    id: anomalyId,
    type: result,
    subjectType: 'item',
    subjectId: event.payload.itemId,
    containerId: event.payload.containerId,
    quantity: Math.max(1, Number(event.payload.missingQuantity) || 1),
    severity,
    status: 'open',
    note: event.payload.note || '',
    createdAt: event.at,
    originEventId: event.id
  };
  const action = {
    id: createId('action'),
    type,
    title: context.actionTitle || 'Traiter une non-conformité',
    status: 'open',
    priority: computePriority({ severity, type, dueAt: context.dueAt || event.at, createdAt: event.at }, new Date(event.at)).level,
    containerId: event.payload.containerId,
    targetZoneId: context.targetZoneId,
    targetZoneStatus: context.targetZoneStatus || 'missing-to-validate',
    finalZoneId: context.finalZoneId || null,
    finalZoneStatus: context.finalZoneStatus || 'missing-to-validate',
    originAnomalyId: anomalyId,
    lines: [{ itemId: event.payload.itemId, quantity: anomaly.quantity, done: false }],
    createdAt: event.at,
    dueAt: context.dueAt || event.at,
    referenceVersion: event.referenceVersion
  };
  return { anomalies: [anomaly], actions: [action] };
}

export function deriveConsequences(event, context = {}) {
  if (event.type === 'AUDIT_OBSERVATION_RECORDED') return actionForObservation(event, context);

  if (event.type === 'DEFECT_REPORTED') {
    const anomalyId = createId('anomaly');
    return {
      anomalies: [{
        id: anomalyId,
        type: 'defaut_fonctionnel',
        subjectType: event.payload.itemId ? 'item' : 'container',
        subjectId: event.payload.itemId || event.payload.containerId,
        containerId: event.payload.containerId,
        quantity: 1,
        severity: event.payload.blocking ? 'bloquant' : 'attention',
        status: 'open',
        note: event.payload.note || '',
        createdAt: event.at,
        originEventId: event.id
      }],
      actions: [{
        id: createId('action'),
        type: ACTION_TYPES.REPAIR,
        title: event.payload.title || 'Traiter un défaut fonctionnel',
        status: 'open',
        priority: computePriority({ severity: event.payload.blocking ? 'bloquant' : 'attention', type: ACTION_TYPES.REPAIR, dueAt: event.at, createdAt: event.at }, new Date(event.at)).level,
        containerId: event.payload.containerId,
        targetZoneId: context.targetZoneId,
        targetZoneStatus: context.targetZoneStatus || 'missing-to-validate',
        finalZoneId: context.finalZoneId || null,
        finalZoneStatus: context.finalZoneStatus || 'missing-to-validate',
        originAnomalyId: anomalyId,
        lines: event.payload.itemId ? [{ itemId: event.payload.itemId, quantity: 1, done: false }] : [],
        createdAt: event.at,
        dueAt: event.at,
        referenceVersion: event.referenceVersion
      }]
    };
  }

  if (['ITEM_USAGE_DECLARED', 'ITEM_MISSING_DECLARED'].includes(event.type)) {
    const normalUsage = event.type === 'ITEM_USAGE_DECLARED';
    const anomalyId = createId('anomaly');
    return {
      anomalies: [{
        id: anomalyId,
        type: normalUsage ? 'usage_restock_required' : 'manquant',
        family: normalUsage ? 'usage_normal' : 'anomalie_conformite',
        subjectType: 'item',
        subjectId: event.payload.itemId,
        containerId: event.payload.containerId,
        quantity: Math.max(1, Number(event.payload.quantity) || 1),
        severity: 'attention',
        status: 'open',
        note: event.payload.note || '',
        createdAt: event.at,
        originEventId: event.id
      }],
      actions: [{
        id: createId('action'),
        type: ACTION_TYPES.RESTOCK,
        title: event.payload.actionTitle,
        status: 'open',
        priority: computePriority({ severity: 'attention', type: ACTION_TYPES.RESTOCK, dueAt: event.at, createdAt: event.at }, new Date(event.at)).level,
        containerId: event.payload.containerId,
        sectionId: event.payload.sectionId || null,
        targetZoneId: context.targetZoneId,
        targetZoneStatus: context.targetZoneStatus || 'missing-to-validate',
        finalZoneId: context.finalZoneId || null,
        finalZoneStatus: context.finalZoneStatus || 'missing-to-validate',
        originAnomalyId: anomalyId,
        lines: [{ itemId: event.payload.itemId, quantity: Math.max(1, Number(event.payload.quantity) || 1), done: false }],
        createdAt: event.at,
        dueAt: event.at,
        referenceVersion: event.referenceVersion
      }]
    };
  }

  if (event.type === 'USAGE_DECLARED') {
    const anomalyId = createId('anomaly');
    return {
      anomalies: [{
        id: anomalyId,
        type: 'controle_requis',
        subjectType: event.payload.sectionId ? 'section' : 'container',
        subjectId: event.payload.sectionId || event.payload.containerId,
        containerId: event.payload.containerId,
        sectionId: event.payload.sectionId || null,
        quantity: 1,
        severity: 'attention',
        status: 'open',
        note: event.payload.note || '',
        createdAt: event.at,
        originEventId: event.id
      }],
      actions: [{
        id: createId('action'),
        type: ACTION_TYPES.CONTROL,
        title: `Contrôler ${event.payload.sectionLabel || event.payload.containerLabel || 'le contenant déclaré'}`,
        status: 'open',
        priority: 'haute',
        containerId: event.payload.containerId,
        sectionId: event.payload.sectionId || null,
        targetZoneId: context.targetZoneId,
        targetZoneStatus: context.targetZoneStatus || 'missing-to-validate',
        finalZoneId: context.finalZoneId || null,
        finalZoneStatus: context.finalZoneStatus || 'missing-to-validate',
        originAnomalyId: anomalyId,
        lines: [],
        createdAt: event.at,
        dueAt: event.at,
        referenceVersion: event.referenceVersion
      }]
    };
  }

  return { anomalies: [], actions: [] };
}
