import { findContainer, findReferenceItem } from '../data/reference.js';

export const AVAILABILITY = Object.freeze({
  READY: 'pret',
  READY_WITH_ANTICIPATION: 'pret_avec_action_a_anticiper',
  TO_CHECK: 'a_verifier',
  TO_RESTOCK: 'a_rearmer',
  UNAVAILABLE: 'indisponible',
  UNKNOWN: 'inconnu'
});

export function deriveAvailability(containerId, state) {
  const container = findContainer(containerId);
  if (!container) return { status: AVAILABILITY.UNKNOWN, label: 'Inconnu', reasons: ['Référentiel introuvable'] };

  const openAnomalies = (state.anomalies || []).filter((anomaly) => anomaly.containerId === containerId && anomaly.status === 'open');
  const openActions = (state.actions || []).filter((action) => action.containerId === containerId && !['done', 'cancelled'].includes(action.status));
  const blocking = openAnomalies.filter((anomaly) => anomaly.severity === 'bloquant');
  const referenceUnvalidated = container.validationRequired || container.sourceStatus !== 'validated';
  const reasons = [
    ...(referenceUnvalidated ? ['Référentiel non validé par l’établissement'] : []),
    ...openAnomalies.map((anomaly) => {
    const item = findReferenceItem(anomaly.subjectId);
    return `${item?.label || container.label} · ${labelAnomaly(anomaly.type)}`;
    })
  ];

  if (blocking.length) return { status: AVAILABILITY.UNAVAILABLE, label: 'Indisponible', reasons, blockingCount: blocking.length, openActionCount: openActions.length };
  const toCheck = openAnomalies.some((anomaly) => ['controle_requis', 'defectueux', 'defaut_fonctionnel', 'donnee_a_confirmer', 'scelle_rompu'].includes(anomaly.type));
  if (toCheck) return { status: AVAILABILITY.TO_CHECK, label: 'À vérifier', reasons, blockingCount: 0, openActionCount: openActions.length };
  const toRestock = openAnomalies.some((anomaly) => ['usage_restock_required', 'manquant', 'quantite_incorrecte', 'perime', 'equipement_absent'].includes(anomaly.type)) || openActions.some((action) => action.type === 'rearmement');
  if (toRestock) return { status: AVAILABILITY.TO_RESTOCK, label: 'À réarmer', reasons, blockingCount: 0, openActionCount: openActions.length };
  const anticipation = openActions.some((action) => action.type === 'remplacement_peremption');
  if (anticipation && referenceUnvalidated) return { status: AVAILABILITY.TO_CHECK, label: 'À vérifier · péremption', reasons: [...reasons, 'Péremption planifiée'], blockingCount: 0, openActionCount: openActions.length };
  if (anticipation) return { status: AVAILABILITY.READY_WITH_ANTICIPATION, label: 'Prêt · action à anticiper', reasons: ['Péremption planifiée'], blockingCount: 0, openActionCount: openActions.length };
  if (openActions.length) return { status: AVAILABILITY.TO_CHECK, label: 'À vérifier', reasons: ['Action ouverte'], blockingCount: 0, openActionCount: openActions.length };
  if (referenceUnvalidated) return { status: AVAILABILITY.TO_CHECK, label: 'À vérifier · référentiel', reasons, blockingCount: 0, openActionCount: 0 };
  return { status: AVAILABILITY.READY, label: 'Prêt', reasons: [], blockingCount: 0, openActionCount: 0 };
}

export function summarizeAvailability(state, containers) {
  const summary = { pret: 0, pret_avec_action_a_anticiper: 0, a_verifier: 0, a_rearmer: 0, indisponible: 0, inconnu: 0 };
  for (const container of containers) summary[deriveAvailability(container.id, state).status] += 1;
  return summary;
}

export function labelAnomaly(type) {
  return ({
    manquant: 'élément manquant',
    quantite_incorrecte: 'quantité incorrecte',
    perime: 'péremption constatée',
    defectueux: 'élément défectueux',
    defaut_fonctionnel: 'défaut fonctionnel',
    controle_requis: 'contrôle requis',
    usage_restock_required: 'réarmement après utilisation'
  })[type] || type.replaceAll('_', ' ');
}
