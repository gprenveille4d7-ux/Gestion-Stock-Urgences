import { DEFAULT_USER, REFERENCE_STATUS } from '../config.js';
import { COMPOSITIONS, findContainer, findReferenceItem, findZone } from '../data/reference.js';
import { deriveConsequences } from '../domain/action-engine.js';
import { createId } from '../domain/ids.js';
import { computePriority } from '../domain/priority.js';
import { validateEvent } from '../domain/validation.js';
import { OperationalRepository } from '../infrastructure/repository.js';
import { LocalOnlySyncAdapter } from '../infrastructure/sync-adapter.js';

function sortByDateDescending(values, key = 'at') {
  return [...values].sort((a, b) => new Date(b[key] || 0) - new Date(a[key] || 0));
}

function validatedStockZoneId(container) {
  return container?.stockZoneStatus === 'validated' ? container.stockZoneId : null;
}

function validatedLocationContext(targetZoneId = null, finalZoneId = null) {
  return {
    targetZoneId,
    targetZoneStatus: targetZoneId ? 'validated' : 'missing-to-validate',
    finalZoneId,
    finalZoneStatus: finalZoneId ? 'validated' : 'missing-to-validate'
  };
}

function hasValidatedActionZone(zoneId, status) {
  return status === 'validated' && Boolean(findZone(zoneId));
}

export class OperationalStore {
  constructor(repository, chariotReference = null) {
    this.repository = repository;
    this.chariotReference = chariotReference;
    this.syncAdapter = new LocalOnlySyncAdapter();
    this.listeners = new Set();
    this.state = {
      ready: false,
      persistent: repository.database.persistent,
      reference: REFERENCE_STATUS,
      chariotReference,
      user: DEFAULT_USER,
      events: [], audits: [], observations: [], anomalies: [], actions: [], lots: [], outbox: [], metadata: [], settings: [], users: [],
      sync: { status: 'local-only', pending: 0, sent: 0 }
    };
  }

  static async create(chariotReference = null) {
    const repository = await OperationalRepository.create();
    const store = new OperationalStore(repository, chariotReference);
    await store.reload(false);
    return store;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) listener(this.state);
  }

  async reload(notify = true) {
    const snapshot = await this.repository.snapshot();
    const userSetting = snapshot.settings.find((setting) => setting.id === 'user');
    this.state = {
      ...this.state,
      ready: true,
      persistent: this.repository.database.persistent,
      user: userSetting ? { ...DEFAULT_USER, ...userSetting } : DEFAULT_USER,
      events: sortByDateDescending(snapshot.events),
      audits: sortByDateDescending(snapshot.audits, 'startedAt'),
      observations: sortByDateDescending(snapshot.observations),
      anomalies: sortByDateDescending(snapshot.anomalies, 'createdAt'),
      actions: sortByDateDescending(snapshot.actions, 'createdAt'),
      lots: snapshot.lots,
      outbox: snapshot.outbox,
      metadata: snapshot.metadata,
      settings: snapshot.settings,
      users: snapshot.users
    };
    this.state.sync = await this.syncAdapter.synchronize(this.state.outbox);
    if (notify) this.notify();
    return this.state;
  }

  createEvent(type, payload, subject = '') {
    const at = new Date().toISOString();
    const event = {
      id: createId('event'), type, subject, at,
      userId: this.state.user.id,
      userRole: this.state.user.role,
      deviceId: 'local-pwa',
      origin: 'local-pwa',
      connectivity: globalThis.navigator?.onLine === false ? 'offline' : 'online',
      syncStatus: 'pending',
      correlationId: payload.correlationId || createId('correlation'),
      referenceVersion: REFERENCE_STATUS.version,
      payload
    };
    const validation = validateEvent(event);
    if (!validation.valid) throw new Error(validation.errors.join(', '));
    return event;
  }

  targetZoneFor(itemId, containerId) {
    const item = findReferenceItem(itemId);
    if (containerId && item?.containerId !== containerId) return null;
    // La réserve de réarmement ne peut être déduite ni de la catégorie du
    // produit ni de l'emplacement du sac. Elle reste vide jusqu'au relevé validé.
    return item?.supplyZoneStatus === 'validated' ? item.supplyZoneId || null : null;
  }

  async declareUsage(containerId, note = '') {
    return this.declareReturn({ containerId, declaration: 'ouvert', note });
  }

  async declareReturn({ containerId, sectionId = null, itemId = null, declaration = 'ouvert', quantity = 1, note = '' }) {
    const container = findContainer(containerId);
    if (!container) throw new Error('Contenant inconnu');
    const section = sectionId ? container.sections.find((candidate) => candidate.id === sectionId) : null;
    const item = itemId ? findReferenceItem(itemId) : null;
    if (item && item.containerId !== containerId) throw new Error('Élément hors du contenant sélectionné');
    if (['utilise', 'manquant'].includes(declaration) && !item) throw new Error('Sélectionnez l’élément utilisé ou manquant');
    if (['utilise', 'manquant'].includes(declaration) && item?.operationalUseAllowed === false) throw new Error('Élément insuffisamment documenté : validation humaine requise avant un réarmement ciblé');
    if (declaration === 'defectueux') return this.reportDefect({ containerId, itemId, note: note || 'Défaut constaté au retour', blocking: false });
    const eventType = declaration === 'utilise' ? 'ITEM_USAGE_DECLARED' : declaration === 'manquant' ? 'ITEM_MISSING_DECLARED' : 'USAGE_DECLARED';
    const subject = item?.label || section?.label || container.label;
    const event = this.createEvent(eventType, {
      containerId,
      containerLabel: container.label,
      sectionId: section?.id || item?.sectionId || null,
      sectionLabel: section?.label || item?.sectionLabel || null,
      itemId: item?.id || null,
      quantity: Math.max(1, Number(quantity) || 1),
      declaration,
      note,
      actionTitle: item ? `${declaration === 'utilise' ? 'Remplacer' : 'Ajouter'} ${Math.max(1, Number(quantity) || 1)} × ${item.label}` : null
    }, subject);
    const confirmedContainerZoneId = validatedStockZoneId(container);
    const consequences = deriveConsequences(event, validatedLocationContext(confirmedContainerZoneId, confirmedContainerZoneId));
    if (item) {
      for (const action of consequences.actions) {
        action.targetZoneId = this.targetZoneFor(item.id, containerId);
        action.targetZoneStatus = action.targetZoneId ? 'validated' : 'missing-to-validate';
      }
    }
    await this.repository.commitEvent(event, consequences);
    await this.reload();
    return consequences.actions[0];
  }

  async startAudit(containerId, originActionId = null, requestedSectionId = null) {
    const container = findContainer(containerId);
    if (!container) throw new Error('Contenant inconnu');
    const originAction = originActionId ? this.state.actions.find((action) => action.id === originActionId) : null;
    const sectionId = requestedSectionId || originAction?.sectionId || null;
    const section = sectionId ? container.sections.find((candidate) => candidate.id === sectionId) : null;
    const composition = COMPOSITIONS.find((candidate) => candidate.containerId === containerId);
    const current = this.state.audits.find((audit) => audit.containerId === containerId && (audit.sectionId || null) === (section?.id || null) && audit.status === 'in_progress');
    if (current) return current;
    const startedAt = new Date().toISOString();
    const audit = {
      id: createId('audit'), type: originActionId ? 'retour_intervention' : 'controle_periodique', period: null,
      containerId, containerLabel: container.label, sectionId: section?.id || null, sectionLabel: section?.label || null,
      status: 'in_progress', startedAt, updatedAt: startedAt, lastItemId: null,
      userId: this.state.user.id, initialAssigneeId: this.state.user.id, assigneeHistory: [{ userId: this.state.user.id, at: startedAt }],
      referenceVersion: REFERENCE_STATUS.version, compositionId: composition?.id || null, compositionVersion: composition?.version || null, originActionId,
      plannedItemIds: section ? section.items.map((item) => item.id) : container.sections.flatMap((candidate) => candidate.items.map((item) => item.id))
    };
    const event = this.createEvent('AUDIT_STARTED', { auditId: audit.id, containerId, sectionId: audit.sectionId, originActionId, compositionId: audit.compositionId, compositionVersion: audit.compositionVersion }, container.label);
    await this.repository.commitEvent(event, {}, [{ store: 'audits', type: 'put', value: audit }]);
    await this.reload();
    return audit;
  }

  async recordAuditObservation({ auditId, itemId, result, observedQuantity = null, note = '', severity = 'attention' }) {
    const audit = this.state.audits.find((candidate) => candidate.id === auditId);
    const item = findReferenceItem(itemId);
    const container = findContainer(audit?.containerId);
    if (!audit || audit.status !== 'in_progress') throw new Error('Contrôle non modifiable');
    if (!item || item.containerId !== audit.containerId) throw new Error('Élément hors référentiel du contrôle');
    const at = new Date().toISOString();
    const quantity = observedQuantity === null ? item.expectedQuantity : Number(observedQuantity);
    const missingQuantity = Math.max(0, item.expectedQuantity - (Number.isFinite(quantity) ? quantity : 0));
    const observation = {
      id: `observation:${auditId}:${itemId}`, auditId, itemId, containerId: audit.containerId, result,
      expectedQuantity: item.expectedQuantity, observedQuantity: Number.isFinite(quantity) ? quantity : null,
      note, severity, at, userId: this.state.user.id, referenceVersion: audit.referenceVersion, compositionId: audit.compositionId
    };
    const event = this.createEvent('AUDIT_OBSERVATION_RECORDED', {
      auditId, itemId, containerId: audit.containerId, result, observedQuantity: observation.observedQuantity, missingQuantity, note, severity
    }, item.label);
    const originAction = this.state.actions.find((action) => action.id === audit.originActionId);
    const finalZoneId = originAction?.finalZoneStatus === 'validated' ? originAction.finalZoneId : validatedStockZoneId(container);
    const consequences = deriveConsequences(event, {
      ...validatedLocationContext(this.targetZoneFor(itemId, audit.containerId), finalZoneId),
      actionTitle: `${result === 'defectueux' ? 'Traiter' : 'Réarmer'} · ${item.label}`
    });
    const updatedAudit = { ...audit, updatedAt: at, lastItemId: itemId };
    await this.repository.commitEvent(event, consequences, [
      { store: 'observations', type: 'put', value: observation },
      { store: 'audits', type: 'put', value: updatedAudit }
    ]);
    await this.reload();
    return observation;
  }

  async pauseAudit(auditId) {
    const audit = this.state.audits.find((candidate) => candidate.id === auditId);
    if (!audit || audit.status !== 'in_progress') throw new Error('Contrôle non interruptible');
    const pausedAt = new Date().toISOString();
    const event = this.createEvent('AUDIT_PAUSED', { auditId, containerId: audit.containerId, lastItemId: audit.lastItemId }, audit.containerLabel);
    await this.repository.commitEvent(event, {}, [{ store: 'audits', type: 'put', value: { ...audit, pausedAt, pauseCount: (audit.pauseCount || 0) + 1, updatedAt: pausedAt } }]);
    await this.reload();
  }

  async resumeAudit(auditId) {
    const audit = this.state.audits.find((candidate) => candidate.id === auditId);
    if (!audit || audit.status !== 'in_progress') throw new Error('Contrôle non reprenable');
    const resumedAt = new Date().toISOString();
    const history = [...(audit.assigneeHistory || [])];
    if (history.at(-1)?.userId !== this.state.user.id) history.push({ userId: this.state.user.id, at: resumedAt });
    const event = this.createEvent('AUDIT_RESUMED', { auditId, containerId: audit.containerId, lastItemId: audit.lastItemId }, audit.containerLabel);
    await this.repository.commitEvent(event, {}, [{ store: 'audits', type: 'put', value: { ...audit, pausedAt: null, resumedAt, userId: this.state.user.id, assigneeHistory: history, updatedAt: resumedAt } }]);
    await this.reload();
    return this.state.audits.find((candidate) => candidate.id === auditId);
  }

  async assignAudit(auditId, userId, reason = '') {
    const audit = this.state.audits.find((candidate) => candidate.id === auditId);
    const assignee = this.state.users.find((candidate) => candidate.id === userId && candidate.active);
    if (!audit || audit.status !== 'in_progress') throw new Error('Contrôle non attribuable');
    if (!assignee) throw new Error('Utilisateur actif introuvable');
    const assignedAt = new Date().toISOString();
    const history = [...(audit.assigneeHistory || []), { userId, at: assignedAt, reason: reason.trim() }];
    const event = this.createEvent('AUDIT_REASSIGNED', { auditId, previousUserId: audit.userId, nextUserId: userId, reason: reason.trim() }, audit.containerLabel);
    await this.repository.commitEvent(event, {}, [
      { store: 'audits', type: 'put', value: { ...audit, userId, assigneeHistory: history, updatedAt: assignedAt } },
      { store: 'users', type: 'put', value: { ...assignee, controlCount: (assignee.controlCount || 0) + 1, lastAssignedAt: assignedAt } }
    ]);
    await this.reload();
  }

  async completeAudit(auditId) {
    const audit = this.state.audits.find((candidate) => candidate.id === auditId);
    if (!audit || audit.status !== 'in_progress') throw new Error('Contrôle non clôturable');
    const observed = new Set(this.state.observations.filter((observation) => observation.auditId === auditId).map((observation) => observation.itemId));
    if (audit.plannedItemIds.some((itemId) => !observed.has(itemId))) throw new Error('Tous les éléments doivent être contrôlés avant la clôture');
    const completedAt = new Date().toISOString();
    const completedAudit = { ...audit, status: 'completed', completedAt, updatedAt: completedAt };
    const event = this.createEvent('AUDIT_COMPLETED', { auditId, containerId: audit.containerId }, audit.containerLabel);
    const operations = [{ store: 'audits', type: 'put', value: completedAudit }];
    const originAction = audit.originActionId ? this.state.actions.find((item) => item.id === audit.originActionId) : null;
    const anomaliesToResolve = originAction?.originAnomalyId
      ? this.state.anomalies.filter((item) => item.id === originAction.originAnomalyId && item.status === 'open')
      : this.state.anomalies.filter((item) => item.containerId === audit.containerId && item.sectionId === (audit.sectionId || null) && item.type === 'controle_requis' && item.status === 'open');
    for (const anomaly of anomaliesToResolve) {
      operations.push({ store: 'anomalies', type: 'put', value: { ...anomaly, status: 'resolved', resolvedAt: completedAt, resolutionEventId: event.id } });
    }
    const controlsToComplete = audit.originActionId
      ? this.state.actions.filter((item) => item.id === audit.originActionId && !['done', 'cancelled'].includes(item.status))
      : this.state.actions.filter((item) => item.containerId === audit.containerId && item.sectionId === (audit.sectionId || null) && item.type === 'controle' && !['done', 'cancelled'].includes(item.status));
    for (const action of controlsToComplete) {
      operations.push({ store: 'actions', type: 'put', value: { ...action, status: 'done', completedAt, completionEventId: event.id } });
    }
    await this.repository.commitEvent(event, {}, operations);
    await this.reload();
  }

  async reportDefect({ containerId, itemId = null, note, blocking = false }) {
    const container = findContainer(containerId);
    if (!container || !note?.trim()) throw new Error('Contenant et description requis');
    const item = itemId ? findReferenceItem(itemId) : null;
    const event = this.createEvent('DEFECT_REPORTED', { containerId, itemId, note: note.trim(), blocking, title: `Défaut · ${item?.label || container.label}` }, item?.label || container.label);
    const consequences = deriveConsequences(event, validatedLocationContext(null, validatedStockZoneId(container)));
    await this.repository.commitEvent(event, consequences);
    await this.reload();
    return consequences.actions[0];
  }

  async planExpiryReplacement(lotId) {
    const lot = this.state.lots.find((candidate) => candidate.id === lotId);
    const item = findReferenceItem(lot?.itemId);
    if (!lot || !item) throw new Error('Lot inconnu');
    const duplicate = this.state.actions.find((action) => action.lotId === lotId && !['done', 'cancelled'].includes(action.status));
    if (duplicate) return duplicate;
    const event = this.createEvent('EXPIRY_REPLACEMENT_PLANNED', { lotId, itemId: item.id, containerId: item.containerId }, item.label);
    const action = {
      id: createId('action'), type: 'remplacement_peremption', title: `Remplacer avant péremption · ${item.label}`,
      status: 'open', priority: computePriority({ severity: 'attention', type: 'remplacement_peremption', dueAt: lot.expiryDate, createdAt: event.at }, new Date(event.at)).level, containerId: item.containerId,
      ...validatedLocationContext(this.targetZoneFor(item.id, item.containerId), validatedStockZoneId(findContainer(item.containerId))),
      lotId, lines: [{ itemId: item.id, quantity: lot.quantity || 1, done: false }], createdAt: event.at, dueAt: lot.expiryDate, originEventId: event.id
    };
    await this.repository.commitEvent(event, { actions: [action], anomalies: [] });
    await this.reload();
    return action;
  }

  async toggleActionLine(actionId, itemId) {
    const action = this.state.actions.find((candidate) => candidate.id === actionId);
    if (!action || ['done', 'cancelled'].includes(action.status)) throw new Error('Action non modifiable');
    if (action.type !== 'controle' && !hasValidatedActionZone(action.targetZoneId, action.targetZoneStatus)) throw new Error('Emplacement de prélèvement à confirmer avant la collecte');
    const lines = action.lines.map((line) => line.itemId === itemId ? { ...line, done: !line.done } : line);
    const updated = { ...action, status: 'in_progress', stage: action.stage || 'collecte', startedAt: action.startedAt || new Date().toISOString(), assignedUserId: action.assignedUserId || this.state.user.id, lines, updatedAt: new Date().toISOString() };
    const toggledLine = lines.find((line) => line.itemId === itemId);
    const event = this.createEvent('ACTION_LINE_TOGGLED', { actionId, itemId, done: toggledLine?.done === true }, action.title);
    await this.repository.commitEvent(event, {}, [{ store: 'actions', type: 'put', value: updated }]);
    await this.reload();
  }

  async advanceAction(actionId) {
    const action = this.state.actions.find((candidate) => candidate.id === actionId);
    if (!action || ['done', 'cancelled'].includes(action.status)) throw new Error('Action non modifiable');
    if (action.type === 'controle') throw new Error('Démarrez le contrôle associé pour traiter cette action');
    const allLinesDone = !action.lines?.length || action.lines.every((line) => line.done);
    if (!allLinesDone) throw new Error('Toutes les lignes doivent être confirmées');
    const currentStage = action.stage || 'collecte';
    if (action.type !== 'controle' && currentStage === 'collecte' && !hasValidatedActionZone(action.targetZoneId, action.targetZoneStatus)) throw new Error('Emplacement de prélèvement à confirmer avant la collecte');
    if (action.type !== 'controle' && currentStage !== 'collecte' && !hasValidatedActionZone(action.finalZoneId, action.finalZoneStatus)) throw new Error('Destination finale à confirmer avant la remise en place');
    const nextStage = !action.stage || action.stage === 'collecte' ? 'verification' : action.stage === 'verification' ? 'remise_en_place' : 'done';
    if (nextStage === 'done' && action.type === 'remplacement_peremption') throw new Error('Enregistrez le nouveau lot et sa péremption pour clôturer');
    if (nextStage === 'done') return this.completeAction(actionId);
    const updated = { ...action, status: 'in_progress', stage: nextStage, startedAt: action.startedAt || new Date().toISOString(), assignedUserId: action.assignedUserId || this.state.user.id, updatedAt: new Date().toISOString() };
    const event = this.createEvent('ACTION_STAGE_CHANGED', { actionId, previousStage: action.stage || 'collecte', nextStage }, action.title);
    await this.repository.commitEvent(event, {}, [{ store: 'actions', type: 'put', value: updated }]);
    await this.reload();
    return updated;
  }

  async completeExpiryAction(actionId, { lotNumber, expiryMonth, quantity = 1 }) {
    const action = this.state.actions.find((candidate) => candidate.id === actionId);
    const oldLot = this.state.lots.find((candidate) => candidate.id === action?.lotId);
    const itemId = action?.lines?.[0]?.itemId;
    if (!action || action.type !== 'remplacement_peremption' || action.stage !== 'remise_en_place') throw new Error('Action de péremption non clôturable');
    if (!hasValidatedActionZone(action.finalZoneId, action.finalZoneStatus)) throw new Error('Destination finale à confirmer avant la clôture');
    if (!/^\d{4}-\d{2}$/.test(expiryMonth || '')) throw new Error('Mois et année de péremption requis');
    if (!lotNumber?.trim()) throw new Error('Numéro de lot requis');
    const [year, month] = expiryMonth.split('-').map(Number);
    const expiryDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();
    const completedAt = new Date().toISOString();
    const newLot = {
      id: createId('lot'), itemId, lotNumber: lotNumber.trim(), expiryDate,
      quantity: Math.max(1, Number(quantity) || 1), status: 'active', enteredAt: completedAt, enteredBy: this.state.user.id, source: 'user-entry'
    };
    const event = this.createEvent('EXPIRY_REPLACED', { actionId, oldLotId: oldLot?.id || null, newLotId: newLot.id, itemId, expiryMonth }, action.title);
    const operations = [
      { store: 'actions', type: 'put', value: { ...action, status: 'done', stage: 'done', completedAt, completionEventId: event.id } },
      { store: 'lots', type: 'put', value: newLot }
    ];
    if (oldLot) operations.push({ store: 'lots', type: 'put', value: { ...oldLot, status: 'replaced', replacedAt: completedAt, replacementLotId: newLot.id } });
    await this.repository.commitEvent(event, {}, operations);
    await this.reload();
    return newLot;
  }

  async completeAction(actionId) {
    const action = this.state.actions.find((candidate) => candidate.id === actionId);
    if (!action || ['done', 'cancelled'].includes(action.status)) throw new Error('Action déjà clôturée');
    if (action.type === 'controle') throw new Error('Clôturez le contrôle associé pour terminer cette action');
    if (action.type === 'remplacement_peremption') throw new Error('Enregistrez le nouveau lot et sa péremption pour clôturer');
    if (action.stage !== 'remise_en_place') throw new Error('Les étapes de collecte et de vérification doivent précéder la clôture');
    if (!hasValidatedActionZone(action.targetZoneId, action.targetZoneStatus)) throw new Error('Emplacement de prélèvement à confirmer avant la clôture');
    if (!hasValidatedActionZone(action.finalZoneId, action.finalZoneStatus)) throw new Error('Destination finale à confirmer avant la clôture');
    const completedAt = new Date().toISOString();
    const event = this.createEvent('ACTION_COMPLETED', { actionId, actionType: action.type, containerId: action.containerId }, action.title);
    const operations = [{ store: 'actions', type: 'put', value: { ...action, status: 'done', stage: 'done', completedAt, completionEventId: event.id } }];
    if (action.originAnomalyId) {
      const anomaly = this.state.anomalies.find((candidate) => candidate.id === action.originAnomalyId);
      if (anomaly) operations.push({ store: 'anomalies', type: 'put', value: { ...anomaly, status: 'resolved', resolvedAt: completedAt, resolutionEventId: event.id } });
    }
    if (action.lotId) {
      const lot = this.state.lots.find((candidate) => candidate.id === action.lotId);
      if (lot) operations.push({ store: 'lots', type: 'put', value: { ...lot, status: 'replaced', replacedAt: completedAt } });
    }
    await this.repository.commitEvent(event, {}, operations);
    await this.reload();
  }

  async setUserRole(role) {
    await this.repository.put('settings', { ...this.state.user, id: 'user', role });
    await this.reload();
  }
}
