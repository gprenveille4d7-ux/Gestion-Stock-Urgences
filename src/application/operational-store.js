import { DEFAULT_EXPIRY_THRESHOLDS, DEFAULT_USER, REFERENCE_STATUS } from '../config.js';
import { findActiveChariotItem, findActiveChariotSection } from '../data/chariot-adapter.js';
import { COMPOSITIONS, findContainer, findReferenceItem, findZone } from '../data/reference.js';
import { deriveConsequences } from '../domain/action-engine.js';
import { computeExpiryDashboard, expiryDateFromMonth, normalizeExpiryThresholds } from '../domain/expiry.js';
import { createId } from '../domain/ids.js';
import { computePriority } from '../domain/priority.js';
import { validateEvent } from '../domain/validation.js';
import { OperationalRepository } from '../infrastructure/repository.js';
import { LocalOnlySyncAdapter } from '../infrastructure/sync-adapter.js';

function sortByDateDescending(values, key = 'at') {
  return [...values].sort((a, b) => new Date(b[key] || 0) - new Date(a[key] || 0));
}

function validatedStockZoneId(container) {
  return [container?.stockZoneStatus, container?.physicalLayoutStatus].some((status) => ['validated', 'physical-layout-validated'].includes(status)) ? container.stockZoneId : null;
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
  return ['validated', 'physical-layout-validated'].includes(status) && Boolean(findZone(zoneId));
}

function positiveInteger(value, fieldLabel) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`${fieldLabel} doit être un entier positif`);
  return number;
}

function appendLotHistory(lot, entry) {
  return [...(lot.history || []), entry];
}

function assertExpiryAction(action, expectedStage = null) {
  if (!action || action.type !== 'remplacement_peremption' || ['done', 'cancelled'].includes(action.status)) throw new Error('Action de péremption non modifiable');
  if (expectedStage && action.stage !== expectedStage) throw new Error(`Étape attendue : ${expectedStage}`);
  return action;
}

function observedLocationForItem(item, { containerId = null, sectionId = null, locationId = null, locationLabel = '', locationStatus = 'physical-layout-provisional' } = {}, chariotReference = null) {
  const chariotContext = item?.referenceType === 'xlsx'
    ? findActiveChariotSection(chariotReference, item.containerId, item.sectionId)
    : null;
  const resolvedContainer = findContainer(containerId || item?.containerId);
  const resolvedSectionId = sectionId || item?.sectionId;
  const resolvedSection = resolvedContainer?.sections.find((section) => section.id === resolvedSectionId);
  if (!item) throw new Error('Produit absent du référentiel actif');
  if (item.referenceType === 'xlsx') {
    if (!chariotContext || (containerId && containerId !== item.containerId) || (sectionId && sectionId !== item.sectionId)) throw new Error('Emplacement incompatible avec le produit');
  } else {
    if (!resolvedContainer || resolvedContainer.id !== item.containerId) throw new Error('Contenant incompatible avec le produit');
    if (!resolvedSection) throw new Error('Section introuvable dans le contenant');
  }
  const normalizedStatus = locationStatus === 'validated'
    ? 'physical-layout-validated'
    : ['provisional', 'provisional-to-validate', 'missing-to-validate'].includes(locationStatus)
      ? 'physical-layout-provisional'
      : locationStatus;
  if (!['physical-layout-provisional', 'physical-layout-validated'].includes(normalizedStatus)) throw new Error('État de l’emplacement invalide');
  return Object.freeze({
    containerId: item.referenceType === 'xlsx' ? chariotContext.reference.id : resolvedContainer.id,
    containerLabel: item.referenceType === 'xlsx' ? chariotContext.reference.label : resolvedContainer.label,
    sectionId: item.referenceType === 'xlsx' ? chariotContext.section.id : resolvedSection.id,
    sectionLabel: (item.referenceType === 'xlsx' ? chariotContext.section.label : resolvedSection.label) || 'Zone à préciser',
    locationId: locationId || (item.referenceType === 'xlsx' ? chariotContext.section.id : resolvedSection.id),
    locationLabel: String(locationLabel || (item.referenceType === 'xlsx' ? chariotContext.section.label : resolvedSection.label) || 'Zone à préciser').trim(),
    status: normalizedStatus
  });
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
      expiryThresholds: DEFAULT_EXPIRY_THRESHOLDS,
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
    const expirySetting = snapshot.settings.find((setting) => setting.id === 'expiry-thresholds');
    this.state = {
      ...this.state,
      ready: true,
      persistent: this.repository.database.persistent,
      user: userSetting ? { ...DEFAULT_USER, ...userSetting, id: userSetting.userId || DEFAULT_USER.id } : DEFAULT_USER,
      events: sortByDateDescending(snapshot.events),
      audits: sortByDateDescending(snapshot.audits, 'startedAt'),
      observations: sortByDateDescending(snapshot.observations),
      anomalies: sortByDateDescending(snapshot.anomalies, 'createdAt'),
      actions: sortByDateDescending(snapshot.actions, 'createdAt'),
      lots: snapshot.lots,
      outbox: snapshot.outbox,
      metadata: snapshot.metadata,
      settings: snapshot.settings,
      users: snapshot.users,
      expiryThresholds: normalizeExpiryThresholds(expirySetting || DEFAULT_EXPIRY_THRESHOLDS)
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
      payload,
      source: 'user-entry'
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
    return ['validated', 'physical-layout-validated'].includes(item?.supplyZoneStatus) ? item.supplyZoneId || null : null;
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
    const finalZoneId = hasValidatedActionZone(originAction?.finalZoneId, originAction?.finalZoneStatus) ? originAction.finalZoneId : validatedStockZoneId(container);
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

  findTrackedReferenceItem(itemId) {
    return findReferenceItem(itemId) || findActiveChariotItem(this.chariotReference, itemId);
  }

  getExpiryDashboard(now = new Date()) {
    return computeExpiryDashboard(this.state.lots, now, this.state.expiryThresholds);
  }

  async setExpiryThresholds(thresholds) {
    const normalized = normalizeExpiryThresholds(thresholds);
    await this.repository.put('settings', { id: 'expiry-thresholds', ...normalized, source: 'user-setting', updatedAt: new Date().toISOString(), updatedBy: this.state.user.id });
    await this.reload();
    return this.state.expiryThresholds;
  }

  async addTrackedLot({ itemId, containerId = null, sectionId = null, locationId = null, locationLabel = '', locationStatus = 'physical-layout-provisional', lotNumber, expiryMonth, quantity = 1 }) {
    const item = this.findTrackedReferenceItem(itemId);
    if (!item) throw new Error('Produit absent du référentiel actif');
    if (!lotNumber?.trim()) throw new Error('Numéro de lot requis');
    const quantityPresent = positiveInteger(quantity, 'La quantité');
    const expiryDate = expiryDateFromMonth(expiryMonth);
    const observedLocation = observedLocationForItem(item, { containerId, sectionId, locationId, locationLabel, locationStatus }, this.chariotReference);
    const recordedAt = new Date().toISOString();
    const lot = {
      id: createId('lot'),
      itemId: item.id,
      productId: item.productId,
      lotNumber: lotNumber.trim(),
      expiryMonth,
      expiryDate,
      quantity: quantityPresent,
      quantityPresent,
      status: 'active',
      state: 'active',
      recordedAt,
      enteredAt: recordedAt,
      recordedBy: this.state.user.id,
      enteredBy: this.state.user.id,
      observedLocation,
      containerId: observedLocation.containerId,
      containerLabel: observedLocation.containerLabel,
      sectionId: observedLocation.sectionId,
      sectionLabel: observedLocation.sectionLabel,
      locationId: observedLocation.locationId,
      locationLabel: observedLocation.locationLabel,
      locationStatus: observedLocation.status,
      referenceSnapshot: {
        referenceVersion: REFERENCE_STATUS.version,
        sourceId: item.sourceId,
        itemLabel: item.label,
        expectedQuantity: item.expectedQuantity,
        containerId: item.containerId,
        sectionId: item.sectionId,
        ambiguities: [...(item.validationIssues || [])]
      },
      history: [{ type: 'recorded', at: recordedAt, userId: this.state.user.id, quantity: quantityPresent, observedLocation }],
      source: 'user-entry'
    };
    const event = this.createEvent('LOT_RECORDED', {
      lotId: lot.id,
      itemId: item.id,
      containerId: observedLocation.containerId,
      sectionId: observedLocation.sectionId,
      lotNumber: lot.lotNumber,
      expiryMonth,
      quantity: quantityPresent
    }, item.label);
    await this.repository.commitEvent(event, {}, [{ store: 'lots', type: 'put', value: lot }]);
    await this.reload();
    return lot;
  }

  async planExpiryReplacement(lotId) {
    const lot = this.state.lots.find((candidate) => candidate.id === lotId);
    const item = this.findTrackedReferenceItem(lot?.itemId);
    if (!lot || !item || (lot.status || lot.state) !== 'active') throw new Error('Lot actif inconnu');
    const duplicate = this.state.actions.find((action) => action.lotId === lotId && !['done', 'cancelled'].includes(action.status));
    if (duplicate) return duplicate;
    const event = this.createEvent('EXPIRY_REPLACEMENT_PLANNED', { lotId, itemId: item.id, containerId: item.containerId }, item.label);
    const action = {
      id: createId('action'), type: 'remplacement_peremption', title: `Remplacer avant péremption · ${item.label}`,
      status: 'open',
      workflow: 'expiry-replacement-v1',
      stage: 'localiser',
      priority: computePriority({ severity: 'attention', type: 'remplacement_peremption', dueAt: lot.expiryDate, createdAt: event.at }, new Date(event.at)).level,
      containerId: item.containerId,
      sectionId: item.sectionId,
      observedLocation: lot.observedLocation || null,
      targetZoneId: null,
      targetZoneStatus: 'not-required-user-observed-location',
      finalZoneId: null,
      finalZoneStatus: 'not-required-user-observed-location',
      lotId,
      lines: [{ itemId: item.id, quantity: lot.quantityPresent || lot.quantity || 1, done: false }],
      createdAt: event.at,
      dueAt: lot.expiryDate,
      originEventId: event.id,
      source: 'user-entry'
    };
    await this.repository.commitEvent(event, { actions: [action], anomalies: [] });
    await this.reload();
    return action;
  }

  async localizeExpiryAction(actionId, location = null) {
    const action = assertExpiryAction(this.state.actions.find((candidate) => candidate.id === actionId), 'localiser');
    const lot = this.state.lots.find((candidate) => candidate.id === action.lotId);
    const item = this.findTrackedReferenceItem(lot?.itemId);
    if (!lot || !item) throw new Error('Lot ou produit introuvable');
    const confirmedLocation = location
      ? observedLocationForItem(item, location, this.chariotReference)
      : lot.observedLocation;
    if (!confirmedLocation) throw new Error('Emplacement constaté requis');
    const at = new Date().toISOString();
    const updated = {
      ...action,
      status: 'in_progress',
      stage: 'retirer',
      confirmedLocation,
      locatedAt: at,
      startedAt: action.startedAt || at,
      assignedUserId: action.assignedUserId || this.state.user.id,
      updatedAt: at
    };
    const event = this.createEvent('EXPIRY_ITEM_LOCATED', { actionId, lotId: lot.id, itemId: item.id, confirmedLocation }, item.label);
    await this.repository.commitEvent(event, {}, [{ store: 'actions', type: 'put', value: updated }]);
    await this.reload();
    return updated;
  }

  async removeExpiryLot(actionId, { quantity, reason = '', motif = '', withdrawalReason = '' }) {
    const action = assertExpiryAction(this.state.actions.find((candidate) => candidate.id === actionId), 'retirer');
    const oldLot = this.state.lots.find((candidate) => candidate.id === action.lotId);
    if (!oldLot || (oldLot.status || oldLot.state) !== 'active') throw new Error('Ancien lot actif introuvable');
    const quantityRemoved = positiveInteger(quantity, 'La quantité retirée');
    const quantityPresent = positiveInteger(oldLot.quantityPresent || oldLot.quantity, 'La quantité présente');
    if (quantityRemoved !== quantityPresent) throw new Error('La totalité du lot sélectionné doit être retirée');
    const normalizedReason = String(reason || motif || withdrawalReason).trim();
    if (!normalizedReason) throw new Error('Motif du retrait requis');
    const at = new Date().toISOString();
    const oldLotUpdate = {
      ...oldLot,
      quantityPresent: 0,
      status: 'withdrawn',
      state: 'withdrawn',
      withdrawnAt: at,
      withdrawnBy: this.state.user.id,
      withdrawalReason: normalizedReason,
      history: appendLotHistory(oldLot, { type: 'withdrawn', at, userId: this.state.user.id, quantity: quantityRemoved, reason: normalizedReason, actionId })
    };
    const updated = {
      ...action,
      stage: 'remplacer',
      removal: { quantity: quantityRemoved, reason: normalizedReason, oldLotNumber: oldLot.lotNumber, recordedAt: at, recordedBy: this.state.user.id },
      lines: action.lines.map((line) => ({ ...line, done: true })),
      updatedAt: at
    };
    const event = this.createEvent('EXPIRY_LOT_WITHDRAWN', { actionId, oldLotId: oldLot.id, itemId: oldLot.itemId, quantity: quantityRemoved, reason: normalizedReason }, action.title);
    await this.repository.commitEvent(event, {}, [
      { store: 'lots', type: 'put', value: oldLotUpdate },
      { store: 'actions', type: 'put', value: updated }
    ]);
    await this.reload();
    return oldLotUpdate;
  }

  async replaceExpiryLot(actionId, { lotNumber, expiryMonth, quantity }) {
    const action = assertExpiryAction(this.state.actions.find((candidate) => candidate.id === actionId), 'remplacer');
    const oldLot = this.state.lots.find((candidate) => candidate.id === action.lotId);
    const item = this.findTrackedReferenceItem(oldLot?.itemId);
    if (!oldLot || !item || (oldLot.status || oldLot.state) !== 'withdrawn') throw new Error('Retrait de l’ancien lot non enregistré');
    if (!lotNumber?.trim()) throw new Error('Nouveau numéro de lot requis');
    const installedQuantity = positiveInteger(quantity, 'La quantité installée');
    const expiryDate = expiryDateFromMonth(expiryMonth);
    const at = new Date().toISOString();
    const replacementLot = {
      id: createId('lot'),
      itemId: item.id,
      productId: item.productId,
      lotNumber: lotNumber.trim(),
      expiryMonth,
      expiryDate,
      quantity: installedQuantity,
      quantityPresent: installedQuantity,
      status: 'pending-validation',
      state: 'pending-validation',
      recordedAt: at,
      enteredAt: at,
      recordedBy: this.state.user.id,
      enteredBy: this.state.user.id,
      observedLocation: action.confirmedLocation || oldLot.observedLocation,
      containerId: (action.confirmedLocation || oldLot.observedLocation)?.containerId || item.containerId,
      containerLabel: (action.confirmedLocation || oldLot.observedLocation)?.containerLabel || item.containerLabel,
      sectionId: (action.confirmedLocation || oldLot.observedLocation)?.sectionId || item.sectionId,
      sectionLabel: (action.confirmedLocation || oldLot.observedLocation)?.sectionLabel || item.sectionLabel,
      locationId: (action.confirmedLocation || oldLot.observedLocation)?.locationId || item.sectionId,
      locationLabel: (action.confirmedLocation || oldLot.observedLocation)?.locationLabel || item.sectionLabel || 'Zone à préciser',
      locationStatus: (action.confirmedLocation || oldLot.observedLocation)?.status || 'physical-layout-provisional',
      replacesLotId: oldLot.id,
      referenceSnapshot: oldLot.referenceSnapshot || {
        referenceVersion: REFERENCE_STATUS.version,
        sourceId: item.sourceId,
        itemLabel: item.label,
        expectedQuantity: item.expectedQuantity,
        containerId: item.containerId,
        sectionId: item.sectionId,
        ambiguities: [...(item.validationIssues || [])]
      },
      history: [{ type: 'replacement-recorded', at, userId: this.state.user.id, quantity: installedQuantity, actionId }],
      source: 'user-entry'
    };
    const updated = { ...action, stage: 'valider', replacementLotId: replacementLot.id, replacementRecordedAt: at, updatedAt: at };
    const event = this.createEvent('EXPIRY_REPLACEMENT_RECORDED', { actionId, oldLotId: oldLot.id, newLotId: replacementLot.id, itemId: item.id, expiryMonth, quantity: installedQuantity }, item.label);
    await this.repository.commitEvent(event, {}, [
      { store: 'lots', type: 'put', value: replacementLot },
      { store: 'actions', type: 'put', value: updated }
    ]);
    await this.reload();
    return replacementLot;
  }

  async validateExpiryReplacement(actionId, {
    oldProductRemoved = false,
    newProductInstalled = false,
    quantityCompliant = false,
    removed = false,
    replaced = false,
    quantityConform = false,
    dateRecorded = false,
    containerAvailable = false
  } = {}) {
    const action = assertExpiryAction(this.state.actions.find((candidate) => candidate.id === actionId), 'valider');
    const oldLot = this.state.lots.find((candidate) => candidate.id === action.lotId);
    const newLot = this.state.lots.find((candidate) => candidate.id === action.replacementLotId);
    if (!oldLot || (oldLot.status || oldLot.state) !== 'withdrawn') throw new Error('Ancien produit non retiré');
    if (!newLot || (newLot.status || newLot.state) !== 'pending-validation') throw new Error('Nouveau produit non enregistré');
    const checks = {
      oldProductRemoved: Boolean(oldProductRemoved || removed),
      newProductInstalled: Boolean(newProductInstalled || replaced),
      quantityCompliant: Boolean(quantityCompliant || quantityConform),
      dateRecorded: Boolean(dateRecorded),
      containerAvailable: Boolean(containerAvailable)
    };
    if (!Object.values(checks).every(Boolean)) throw new Error('Toutes les vérifications finales doivent être confirmées');
    const completedAt = new Date().toISOString();
    const event = this.createEvent('EXPIRY_REPLACED', {
      actionId,
      oldLotId: oldLot.id,
      newLotId: newLot.id,
      itemId: newLot.itemId,
      checks
    }, action.title);
    const archivedOldLot = {
      ...oldLot,
      status: 'archived',
      state: 'archived',
      archivedAt: completedAt,
      replacedAt: completedAt,
      replacementLotId: newLot.id,
      history: appendLotHistory(oldLot, { type: 'replacement-validated', at: completedAt, userId: this.state.user.id, replacementLotId: newLot.id, actionId })
    };
    const activeNewLot = {
      ...newLot,
      status: 'active',
      state: 'active',
      installedAt: completedAt,
      installedBy: this.state.user.id,
      history: appendLotHistory(newLot, { type: 'installed-and-validated', at: completedAt, userId: this.state.user.id, actionId })
    };
    const completedAction = { ...action, status: 'done', stage: 'done', completedAt, completionEventId: event.id, validationChecks: event.payload.checks, updatedAt: completedAt };
    await this.repository.commitEvent(event, {}, [
      { store: 'lots', type: 'put', value: archivedOldLot },
      { store: 'lots', type: 'put', value: activeNewLot },
      { store: 'actions', type: 'put', value: completedAction }
    ]);
    await this.reload();
    return activeNewLot;
  }

  async toggleActionLine(actionId, itemId) {
    const action = this.state.actions.find((candidate) => candidate.id === actionId);
    if (!action || ['done', 'cancelled'].includes(action.status)) throw new Error('Action non modifiable');
    if (action.workflow === 'expiry-replacement-v1') throw new Error('Utilisez l’étape Retirer pour enregistrer la quantité et le motif');
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
    if (action.workflow === 'expiry-replacement-v1') {
      if (action.stage === 'localiser') return this.localizeExpiryAction(actionId);
      if (action.stage === 'retirer') throw new Error('Enregistrez la quantité retirée et son motif');
      if (action.stage === 'remplacer') throw new Error('Enregistrez le nouveau lot et sa péremption');
      if (action.stage === 'valider') throw new Error('Confirmez les quatre vérifications finales');
    }
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
    if (action?.workflow === 'expiry-replacement-v1') throw new Error('Suivez les étapes Retirer, Remplacer puis Valider');
    if (!action || action.type !== 'remplacement_peremption' || action.stage !== 'remise_en_place') throw new Error('Action de péremption non clôturable');
    if (!hasValidatedActionZone(action.finalZoneId, action.finalZoneStatus)) throw new Error('Destination finale à confirmer avant la clôture');
    if (!lotNumber?.trim()) throw new Error('Numéro de lot requis');
    const expiryDate = expiryDateFromMonth(expiryMonth);
    const quantityPresent = positiveInteger(quantity, 'La quantité');
    const completedAt = new Date().toISOString();
    const newLot = {
      id: createId('lot'), itemId, lotNumber: lotNumber.trim(), expiryMonth, expiryDate,
      quantity: quantityPresent, quantityPresent, status: 'active', state: 'active', enteredAt: completedAt, recordedAt: completedAt,
      enteredBy: this.state.user.id, recordedBy: this.state.user.id, observedLocation: oldLot?.observedLocation || null,
      replacesLotId: oldLot?.id || null, history: [{ type: 'installed-and-validated', at: completedAt, userId: this.state.user.id, actionId }], source: 'user-entry'
    };
    const event = this.createEvent('EXPIRY_REPLACED', { actionId, oldLotId: oldLot?.id || null, newLotId: newLot.id, itemId, expiryMonth }, action.title);
    const operations = [
      { store: 'actions', type: 'put', value: { ...action, status: 'done', stage: 'done', completedAt, completionEventId: event.id } },
      { store: 'lots', type: 'put', value: newLot }
    ];
    if (oldLot) operations.push({ store: 'lots', type: 'put', value: {
      ...oldLot,
      quantityPresent: 0,
      status: 'archived',
      state: 'archived',
      archivedAt: completedAt,
      replacedAt: completedAt,
      replacementLotId: newLot.id,
      history: appendLotHistory(oldLot, { type: 'replacement-validated', at: completedAt, userId: this.state.user.id, replacementLotId: newLot.id, actionId })
    } });
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
    await this.repository.put('settings', { ...this.state.user, id: 'user', userId: this.state.user.id, role, source: 'user-setting' });
    await this.reload();
  }
}
