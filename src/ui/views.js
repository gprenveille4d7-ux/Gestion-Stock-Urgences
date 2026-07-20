import { APP_RELEASE, DEFAULT_EXPIRY_THRESHOLDS } from '../config.js';
import { flattenActiveChariotReference } from '../data/chariot-adapter.js';
import { OPERATIONAL_ASSETS } from '../data/operational-assets.js';
import { EXCLUDED_SOURCE_CONTENT, SOURCE_DOCUMENTS } from '../data/source-manifest.js';
import { findContainer, findReferenceItem, findZone, REFERENCE_ITEMS, SERVICE_ZONES, SMUR_CONTAINERS } from '../data/reference.js';
import { getChariotDiagram, getContainerDiagram, getReserveDiagram, RESERVE_ZONE_IDS } from '../data/visual-schemas.js';
import { deriveAvailability, summarizeAvailability } from '../domain/availability.js';
import { computeExpiryDashboard, daysUntil, EXPIRY_PANELS } from '../domain/expiry.js';
import { actionZoneId, planRoute } from '../domain/route-planner.js';
import { computeStatistics } from '../domain/statistics.js';
import { escapeHtml, formatDate, formatRelative, icon, normalizeSearch } from './utils.js';
import { renderSchemaThumbnail, renderVisualSchema } from './visual-schema.js';

const SYNTHETIC_SOURCES = new Set(['demo', 'demo-synthetic', 'synthetic', 'example', 'seed-demo']);

function isSynthetic(record) {
  return SYNTHETIC_SOURCES.has(String(record?.source || record?.sourceStatus || '').toLowerCase());
}

function realRecords(records) {
  return Array.isArray(records) ? records.filter((record) => !isSynthetic(record)) : [];
}

function operationalViewState(state) {
  return {
    ...state,
    events: realRecords(state.events),
    audits: realRecords(state.audits),
    observations: realRecords(state.observations),
    anomalies: realRecords(state.anomalies),
    actions: realRecords(state.actions),
    lots: realRecords(state.lots),
    users: realRecords(state.users)
  };
}

function expiryThresholds(state) {
  const settings = Array.isArray(state.settings) ? state.settings : [];
  const configured = state.expiryThresholds
    || settings.find((setting) => ['expiry-thresholds', 'expiryThresholds'].includes(setting?.id))
    || {};
  const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  return {
    urgentDays: numberOr(configured.urgentDays ?? configured.redDays, DEFAULT_EXPIRY_THRESHOLDS.urgentDays),
    rapidReplacementDays: numberOr(configured.rapidReplacementDays ?? configured.orangeDays, DEFAULT_EXPIRY_THRESHOLDS.rapidReplacementDays),
    anticipationDays: numberOr(configured.anticipationDays ?? configured.violetDays, DEFAULT_EXPIRY_THRESHOLDS.anticipationDays),
    monitoringDays: numberOr(configured.monitoringDays, DEFAULT_EXPIRY_THRESHOLDS.monitoringDays)
  };
}

function activeReferenceItems(state) {
  return [...REFERENCE_ITEMS, ...flattenActiveChariotReference(state.chariotReference)];
}

function activeReferenceItem(state, itemId, lot = null) {
  const item = activeReferenceItems(state).find((candidate) => candidate.id === itemId || candidate.rawItemId === itemId);
  if (item) return item;
  const snapshot = lot?.referenceSnapshot;
  return snapshot ? {
    id: itemId,
    label: snapshot.itemLabel,
    expectedQuantity: snapshot.expectedQuantity,
    containerId: snapshot.containerId,
    sectionId: snapshot.sectionId,
    containerLabel: lot.containerLabel,
    sectionLabel: lot.sectionLabel,
    category: 'non_determinee',
    sourceId: snapshot.sourceId,
    referenceType: snapshot.referenceType || null
  } : null;
}

function expiryModels(state, now = new Date()) {
  const thresholds = expiryThresholds(state);
  const actions = realRecords(state.actions);
  const lots = realRecords(state.lots);
  const dashboard = computeExpiryDashboard(lots, now, thresholds);
  const bucketByPanel = {
    [EXPIRY_PANELS.TO_TREAT]: 'urgent',
    [EXPIRY_PANELS.WITHIN_30]: 'soon',
    [EXPIRY_PANELS.WITHIN_90]: 'anticipate',
    monitoring: 'monitor',
    compliant: 'monitor'
  };
  const active = dashboard.activeLots.map((lot) => ({ ...lot, bucket: bucketByPanel[lot.expiryPanel] || 'urgent', item: activeReferenceItem(state, lot.itemId, lot) }));
  const activeLotIds = new Set(active.map((lot) => lot.id));
  const workflowLotIds = new Set(actions.filter((action) => action.type === 'remplacement_peremption' && !['done', 'cancelled'].includes(action.status)).map((action) => action.lotId).filter(Boolean));
  const workflow = lots
    .filter((lot) => workflowLotIds.has(lot.id) && !activeLotIds.has(lot.id))
    .map((lot) => ({ ...lot, daysRemaining: daysUntil(lot.expiryDate, now), bucket: 'urgent', item: activeReferenceItem(state, lot.itemId, lot) }));
  const treated = dashboard.treatedLots.map((lot) => ({ ...lot, bucket: 'treated', item: activeReferenceItem(state, lot.itemId, lot), daysRemaining: daysUntil(lot.expiryDate, now) }));
  return { active, workflow, treated, thresholds };
}

function distinctProductCount(lots) {
  return new Set(lots.map((lot) => lot.itemId).filter(Boolean)).size;
}

function statusPill(status, label) {
  const css = ['pret', 'disponible'].includes(status) ? 'ready' : status === 'indisponible' ? 'blocked' : status === 'pret_avec_action_a_anticiper' ? 'plan' : 'review';
  const iconName = css === 'ready' ? 'check' : css === 'plan' ? 'clock' : css === 'blocked' ? 'alert' : 'search';
  return `<span class="status-pill ${css}">${icon(iconName, 13)}${escapeHtml(label)}</span>`;
}

function header(title, subtitle, eyebrow = 'Préparation opérationnelle', back = '') {
  return `<header class="page-header"><div class="page-header-main">${back ? `<button class="back-button" data-nav="${escapeHtml(back)}" aria-label="Retour">${icon('back')}</button>` : ''}<div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="page-title" tabindex="-1">${escapeHtml(title)}</h1>${subtitle ? `<p class="page-subtitle">${escapeHtml(subtitle)}</p>` : ''}</div></div></header>`;
}

function actionCard(action) {
  const container = findContainer(action.containerId);
  const stage = action.stage ? action.stage.replaceAll('_', ' ') : action.status === 'open' ? 'à démarrer' : action.status;
  const route = action.type === 'remplacement_peremption' && action.lotId ? `expiry/lot/${encodeURIComponent(action.lotId)}` : `action/${action.id}`;
  return `<button class="action-card" data-nav="${route}">
    <span class="action-accent ${action.priority === 'critique' ? 'red' : 'blue'}"></span>
    <span class="action-copy"><strong>${escapeHtml(action.title)}</strong><p>${escapeHtml(container?.label || 'Référentiel importé')}</p><span class="action-meta"><span>${icon('clock', 14)} ${escapeHtml(stage)}</span><span>${escapeHtml(formatRelative(action.dueAt || action.createdAt))}</span></span></span>
    ${icon('chevron', 18)}
  </button>`;
}

function topbar(state, ui) {
  return `<div class="topbar">
    <button class="brand brand-button" data-nav="home" aria-label="Accueil">
      <span class="brand-mark">${icon('activity', 22)}</span><span class="brand-copy"><strong>Relève</strong><small>SMUR · Urgences</small></span>
    </button>
    <div class="topbar-actions"><span class="p0-connectivity ${ui.online ? 'online' : 'offline'}" role="status" aria-live="polite" aria-atomic="true" aria-label="État réseau : ${ui.online ? 'en ligne' : 'hors ligne'}">${icon(ui.online ? 'wifi' : 'offline', 16)}<span>${ui.online ? 'En ligne' : 'Hors ligne'}</span></span><button class="icon-button" data-nav="profile" aria-label="Profil">${icon('user')}</button></div>
  </div>`;
}

function bottomNav(route) {
  const entries = [
    ['home', 'Accueil', 'home'], ['return', 'Retour', 'plus'], ['actions', 'Actions', 'clipboard'], ['inventory', 'Matériel', 'search'], ['profile', 'Profil', 'user']
  ];
  const active = route === 'action' ? 'actions' : route === 'audit' || route === 'audits' ? 'actions' : ['container', 'reserve', 'chariot'].includes(route) ? 'inventory' : route;
  return `<nav class="bottom-nav" aria-label="Navigation principale">${entries.map(([id, label, iconName], index) => `<button class="nav-item ${index === 1 ? 'center' : ''} ${active === id ? 'active' : ''}" data-nav="${id}" ${active === id ? 'aria-current="page"' : ''}>${icon(iconName, 20)}<span>${label}</span></button>`).join('')}</nav>`;
}

function homeExpiryIndicator(tone, value, label) {
  return `<button type="button" class="home-expiry-indicator ${tone}" data-nav="expiry"><strong>${value}</strong><span>${escapeHtml(label)}</span></button>`;
}

function homeQuickAction(route, iconName, label, detail) {
  return `<button type="button" class="home-quick-action" data-nav="${route}"><span class="home-quick-icon">${icon(iconName, 21)}</span><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></span>${icon('chevron', 18)}</button>`;
}
function renderHome(state) {
  const summary = summarizeAvailability(state, SMUR_CONTAINERS);
  const openActions = state.actions.filter((action) => !['done', 'cancelled'].includes(action.status));
  const priorityRank = { critique: 4, haute: 3, normale: 2, planifiee: 1 };
  const prioritized = [...openActions].sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0) || new Date(a.createdAt) - new Date(b.createdAt)).slice(0, 4);
  const expiry = expiryModels(state);
  const expiryCounts = expiry.active.reduce((counts, lot) => ({ ...counts, [lot.bucket]: (counts[lot.bucket] || 0) + 1 }), {});
  const nextLots = expiry.active.filter((lot) => lot.daysRemaining <= expiry.thresholds.anticipationDays).slice(0, 3);
  const readyCount = summary.pret + summary.pret_avec_action_a_anticiper;
  const reviewCount = summary.a_verifier + summary.a_rearmer;
  const completedAudits = state.audits.filter((audit) => audit.status === 'completed');
  const activeAudits = state.audits.filter((audit) => audit.status === 'in_progress');
  const latestAudit = [...completedAudits].sort((left, right) => new Date(right.completedAt || 0) - new Date(left.completedAt || 0))[0];
  const generalTone = summary.indisponible ? 'danger' : reviewCount ? 'warning' : 'success';
  const generalLabel = summary.indisponible
    ? `${summary.indisponible} contenant${summary.indisponible > 1 ? 's' : ''} indisponible${summary.indisponible > 1 ? 's' : ''}`
    : reviewCount
      ? `${reviewCount} contenant${reviewCount > 1 ? 's' : ''} à vérifier`
      : 'Tout est conforme';
  const userName = state.user?.displayName || 'Utilisateur local';
  const userRole = state.user?.team || state.user?.function || state.user?.role || 'Équipe locale';
  return `<header class="home-welcome">
      <p class="eyebrow">Gestion Stock Urgences</p>
      <h1 class="page-title" tabindex="-1">Bonjour ${escapeHtml(userName)}</h1>
      <p>${escapeHtml(userRole)} <span aria-hidden="true">·</span> <span class="${state.persistent ? 'local-active' : 'local-temporary'}">${state.persistent ? 'Données locales actives' : 'Stockage temporaire'}</span></p>
    </header>
    <section class="home-general-card ${generalTone}" aria-labelledby="home-general-title">
      <div class="home-general-heading"><span class="home-general-icon">${icon(generalTone === 'success' ? 'check' : 'alert', 20)}</span><div><p>État général</p><h2 id="home-general-title">${escapeHtml(generalLabel)}</h2></div></div>
      <dl class="home-general-stats">
        <div><dt>Contenants prêts</dt><dd>${readyCount}<span> / ${SMUR_CONTAINERS.length}</span></dd></div>
        <div><dt>Contrôles en cours</dt><dd>${activeAudits.length}</dd></div>
      </dl>
      <p class="home-last-control">${latestAudit ? `Dernier contrôle complet le ${escapeHtml(formatDate(latestAudit.completedAt))}` : 'Aucun contrôle complet enregistré'}</p>
    </section>
    <section class="home-section" aria-labelledby="home-expiry-title">
      <div class="section-head"><h2 id="home-expiry-title">Péremptions</h2><button class="text-button" data-nav="expiry">Voir le suivi</button></div>
      <div class="home-expiry-grid" aria-label="Indicateurs de péremption">
        ${homeExpiryIndicator('red', expiryCounts.urgent || 0, 'À traiter')}
        ${homeExpiryIndicator('orange', expiryCounts.soon || 0, `Dans les ${expiry.thresholds.rapidReplacementDays} jours`)}
        ${homeExpiryIndicator('violet', expiryCounts.anticipate || 0, `Dans les ${expiry.thresholds.anticipationDays} jours`)}
        ${homeExpiryIndicator('green', expiryCounts.monitor || 0, 'Suivis conformes')}
      </div>
    </section>
    <section class="home-section" aria-labelledby="home-actions-title">
      <div class="section-head"><h2 id="home-actions-title">Actions rapides</h2></div>
      <div class="home-quick-grid">
        ${homeQuickAction('inventory', 'bag', 'Inventaires', `${SMUR_CONTAINERS.length} contenants référencés`)}
        ${homeQuickAction('expiry', 'calendar', 'Péremptions', `${expiry.active.length} lot${expiry.active.length > 1 ? 's' : ''} suivi${expiry.active.length > 1 ? 's' : ''}`)}
        ${homeQuickAction('actions', 'clipboard', 'Réarmement SMUR', `${openActions.length} action${openActions.length > 1 ? 's' : ''} ouverte${openActions.length > 1 ? 's' : ''}`)}
        ${homeQuickAction('return', 'plus', 'Retour SMUR', 'Déclarer le matériel utilisé')}
      </div>
    </section>
    <section class="section"><div class="section-head"><h2>Priorités opérationnelles</h2><button class="text-button" data-nav="actions">Tout voir</button></div><div class="action-list">${prioritized.length ? prioritized.map(actionCard).join('') : '<div class="empty-state"><h3>Aucune action ouverte</h3><p>Les contenants connus sont sans action active.</p></div>'}</div></section>
    <section class="section"><div class="section-head"><h2>Prochaines péremptions</h2><button class="text-button" data-nav="expiry">Gérer</button></div><div class="card">${nextLots.map((lot) => `<button type="button" class="p0-list-row expiry-home-row" data-nav="expiry/lot/${encodeURIComponent(lot.id)}"><span><strong>${escapeHtml(lot.item?.label || 'Produit du référentiel')}</strong><small>${escapeHtml(lot.item?.containerLabel || 'Contenant à confirmer')} · lot ${escapeHtml(lot.lotNumber)}</small></span><strong class="p0-days ${lot.daysRemaining <= 0 ? 'danger' : ''}">${lot.daysRemaining} j</strong></button>`).join('') || '<div class="expiry-home-empty"><p>Aucun lot suivi pour le moment</p><button type="button" class="small-button" data-nav="expiry/add">Commencer la saisie</button></div>'}</div></section>`;
}

function renderReturn(state, ui) {
  const selectedContainer = findContainer(ui.usageContainer);
  const sections = selectedContainer?.sections || [];
  const selectedSection = sections.find((section) => section.id === ui.usageSection);
  const items = selectedSection?.items || [];
  const direct = ui.usageItem && ['utilise', 'manquant'].includes(ui.usageDeclaration);
  const diagram = selectedContainer ? getContainerDiagram(selectedContainer) : null;
  return `${header("Retour d'intervention", 'Ciblez le niveau physique le plus précis connu. Le sac parent est déduit automatiquement.', 'Déclaration rapide', 'home')}
    <form id="usage-form" class="p0-form card card-pad">
      <label class="p0-field"><span>1. Sac ou contenant</span><select id="usage-container" name="containerId" required><option value="">Sélectionner…</option>${SMUR_CONTAINERS.map((container) => `<option value="${container.id}" ${ui.usageContainer === container.id ? 'selected' : ''}>${escapeHtml(container.label)}</option>`).join('')}</select></label>
      ${diagram ? renderVisualSchema(diagram, {
        kind: 'container', label: selectedContainer.label, color: selectedContainer.color, selectedTargetId: ui.usageSection,
        actionForZone: (zone) => ({ type: 'select-usage-section', value: zone.targetId })
      }) : ''}
      ${selectedContainer ? `<label class="p0-field"><span>2. Kit ou compartiment (facultatif)</span><select id="usage-section" name="sectionId"><option value="">Tout le contenant</option>${sections.map((section) => `<option value="${section.id}" ${ui.usageSection === section.id ? 'selected' : ''}>${escapeHtml(section.label)}</option>`).join('')}</select></label>` : ''}
      ${selectedSection ? `<label class="p0-field"><span>3. Élément précis si connu (facultatif)</span><select id="usage-item" name="itemId"><option value="">Contrôler tout le kit</option>${items.map((item) => `<option value="${item.id}" ${ui.usageItem === item.id ? 'selected' : ''} ${item.operationalUseAllowed === false ? 'disabled' : ''}>${escapeHtml(item.label)}${item.operationalUseAllowed === false ? ' — À CONFIRMER' : ''}</option>`).join('')}</select></label>` : ''}
      <label class="p0-field"><span>${selectedSection ? '4' : '2'}. Constat</span><select id="usage-declaration" name="declaration"><option value="ouvert" ${ui.usageDeclaration === 'ouvert' ? 'selected' : ''}>Ouvert — contrôle nécessaire</option><option value="utilise" ${ui.usageDeclaration === 'utilise' ? 'selected' : ''}>Élément utilisé — remplacement ciblé</option><option value="manquant" ${ui.usageDeclaration === 'manquant' ? 'selected' : ''}>Élément manquant — anomalie</option><option value="defectueux" ${ui.usageDeclaration === 'defectueux' ? 'selected' : ''}>Défectueux — constat fonctionnel</option></select></label>
      ${ui.usageItem && ['utilise', 'manquant'].includes(ui.usageDeclaration) ? `<label class="p0-field"><span>Quantité concernée</span><input type="number" min="1" step="1" name="quantity" value="1" inputmode="numeric"></label>` : ''}
      <label class="p0-field"><span>Note factuelle (facultatif)</span><textarea name="note" rows="3" placeholder="Décrire uniquement le constat observé"></textarea></label>
      <div class="p0-info">${icon(direct ? 'plus' : 'clipboard', 18)} ${direct ? 'L’élément connu créera directement une action de réarmement, sans imposer un contrôle complet.' : 'Le contrôle sera limité au kit choisi, ou au contenant complet si aucun kit n’est sélectionné.'}</div>
      <button class="primary-button" type="submit">${direct ? 'Créer le réarmement ciblé' : 'Enregistrer la déclaration'}</button>
    </form>
    <section class="section"><div class="section-head"><h2>Flux appliqué</h2></div><ol class="p0-flow"><li><strong>Déclaration</strong><span>Événement horodaté</span></li><li><strong>Contrôle</strong><span>Observations atomiques</span></li><li><strong>Réarmement</strong><span>Actions ciblées</span></li><li><strong>Remise en place</strong><span>Clôture tracée</span></li></ol></section>`;
}

function flattenChariotReference(chariotReference) {
  return flattenActiveChariotReference(chariotReference).map((item) => ({
    ...item,
    documentRef: item.sourceReference,
    revision: item.sourceRevision,
    sourceType: 'xlsx'
  }));
}

function isPhysicalLayoutValidated(diagram, entity) {
  return diagram?.status === 'validated' || diagram?.status === 'physical-layout-validated' || entity?.physicalLayoutStatus === 'physical-layout-validated';
}

function theoreticalTotalForSections(sections) {
  return sections.reduce((sum, section) => sum + section.items.reduce((sectionSum, item) => sectionSum + Number(item.expectedQuantity || 0), 0), 0);
}

function sectionToken(sectionId) {
  return String(sectionId || '').split(':').at(-1);
}

function safeDecode(value) {
  try { return decodeURIComponent(value || ''); } catch { return value || ''; }
}

function findContainerSection(container, token) {
  const decoded = safeDecode(token);
  return container?.sections.find((section) => section.id === decoded || sectionToken(section.id) === decoded) || null;
}

function findChariotSection(reference, sectionId) {
  const decoded = safeDecode(sectionId);
  return reference?.containers.find((container) => container.id === decoded) || null;
}

function openActionTouchesSection(state, containerId, sectionId) {
  return state.actions.some((action) => {
    if (action.containerId !== containerId || ['done', 'cancelled'].includes(action.status)) return false;
    if (action.sectionId === sectionId) return true;
    if (!action.sectionId && !action.lines?.length) return true;
    return action.lines?.some((line) => findReferenceItem(line.itemId)?.sectionId === sectionId);
  });
}

function renderContainerInventoryCard(state, container) {
  const availability = deriveAvailability(container.id, state);
  const itemCount = container.sections.reduce((sum, section) => sum + section.items.length, 0);
  const theoreticalTotal = theoreticalTotalForSections(container.sections);
  const diagram = getContainerDiagram(container);
  const source = SOURCE_DOCUMENTS.find((candidate) => candidate.id === container.sourceId);
  return `<article class="inventory-visual-card">
    <button type="button" class="inventory-visual-main" data-nav="container/${container.id}">
      ${renderSchemaThumbnail(diagram, { kind: 'container', color: container.color })}
      <span class="inventory-visual-copy"><span class="inventory-kind">${escapeHtml(container.kind)} · ${escapeHtml(source?.documentRef || 'source à vérifier')}</span><strong>${escapeHtml(container.label)}</strong><small>${itemCount} lignes · ${container.sections.length} zone${container.sections.length > 1 ? 's' : ''} · total théorique ${theoreticalTotal}</small></span>
      ${icon('chevron', 18)}
    </button>
    <div class="inventory-visual-footer">${statusPill(availability.status, availability.label)}<span>${isPhysicalLayoutValidated(diagram, container) ? 'Organisation visuelle validée' : 'Organisation visuelle à préciser'}</span></div>
  </article>`;
}

function renderReserveInventoryCard(zone) {
  const diagram = getReserveDiagram(zone.id, SMUR_CONTAINERS, realRecords(OPERATIONAL_ASSETS));
  return `<article class="inventory-visual-card reserve-card">
    <button type="button" class="inventory-visual-main" data-nav="reserve/${zone.id}">
      ${renderSchemaThumbnail(diagram, { kind: 'reserve' })}
      <span class="inventory-visual-copy"><span class="inventory-kind">Réserve · implantation à valider</span><strong>${escapeHtml(zone.label)}</strong><small>${diagram.zones.length} contenant${diagram.zones.length > 1 ? 's' : ''} ou équipement${diagram.zones.length > 1 ? 's' : ''} connu${diagram.zones.length > 1 ? 's' : ''}</small></span>
      ${icon('chevron', 18)}
    </button>
    <div class="inventory-visual-footer">${statusPill('a_verifier', 'À cartographier')}<span>Organisation visuelle à préciser</span></div>
  </article>`;
}

function renderChariotInventoryCard(reference) {
  const diagram = getChariotDiagram(reference);
  const itemCount = reference.containers.reduce((sum, container) => sum + container.items.length, 0);
  const theoreticalTotal = theoreticalTotalForSections(reference.containers);
  return `<article class="inventory-visual-card active-reference-card">
    <button type="button" class="inventory-visual-main" data-nav="chariot/${reference.id}">
      ${renderSchemaThumbnail(diagram, { kind: 'chariot' })}
      <span class="inventory-visual-copy"><span class="inventory-kind">Chariot · ${escapeHtml(reference.documentRef || 'référence source non renseignée')} ${escapeHtml(reference.revision || '')}</span><strong>${escapeHtml(reference.label)}</strong><small>${itemCount} lignes · ${reference.containers.length} sections · total théorique ${theoreticalTotal}</small></span>
      ${icon('chevron', 18)}
    </button>
    <div class="inventory-visual-footer">${statusPill('disponible', 'Importé depuis la source')}<span>${isPhysicalLayoutValidated(diagram, reference) ? 'Organisation visuelle validée' : 'Organisation visuelle à préciser'}</span></div>
  </article>`;
}

function renderInventory(state, ui) {
  const query = normalizeSearch(ui.search);
  const chariotItems = flattenChariotReference(state.chariotReference);
  const all = [...REFERENCE_ITEMS.map((item) => ({ ...item, sourceType: 'pdf' })), ...chariotItems];
  const results = query ? all.filter((item) => normalizeSearch(`${item.label} ${item.sourceText || ''} ${item.containerLabel} ${item.sectionLabel} ${item.productCode || ''}`).includes(query)).slice(0, 80) : [];
  const chariots = state.chariotReference?.references || [];
  const inventoryCount = SMUR_CONTAINERS.length + chariots.length;
  return `${header('Matériel', `${REFERENCE_ITEMS.length + chariotItems.length} lignes issues de ${inventoryCount} inventaires chargés, sans masquer leur niveau de validation.`, 'Inventaires visuels')}
    <label class="p0-search">${icon('search', 19)}<span class="sr-only">Rechercher dans le référentiel</span><input id="reference-search" type="search" value="${escapeHtml(ui.search)}" placeholder="Produit, matériel, code ou emplacement…" autocomplete="off"></label>
    ${query ? `<section class="section"><div class="section-head"><h2>${results.length} résultat${results.length > 1 ? 's' : ''}${results.length === 80 ? ' affichés' : ''}</h2></div><div class="p0-search-results">${results.map((item) => {
      const container = item.sourceType === 'pdf' ? findContainer(item.containerId) : null;
      const zone = container ? findZone(container.stockZoneId) : null;
      const route = item.sourceType === 'pdf' ? `container/${item.containerId}/${sectionToken(item.sectionId)}` : `chariot/${item.inventoryId}/${item.sectionId}`;
      return `<article class="p0-search-result"><div><strong>${escapeHtml(item.label)}</strong>${item.sourceStatus === 'source-ambiguity-to-validate' ? `<span class="data-quality-badge">${icon('alert', 12)} Libellé source à valider</span>` : ''}<small>${escapeHtml(item.containerLabel)} › ${escapeHtml(item.sectionLabel)}</small><small>${Number(item.expectedQuantity)} attendu · ${item.sourceType === 'xlsx' ? `inventaire XLSX actif · ${escapeHtml(item.documentRef || 'référence source non renseignée')} ${escapeHtml(item.revision || '')}` : `affectation de zone à confirmer : ${zone?.label || 'non renseignée'}`}</small></div><button class="small-button" data-nav="${escapeHtml(route)}">Voir</button></article>`;
    }).join('') || '<div class="empty-state"><h3>Aucun résultat</h3><p>Essayez un libellé plus court.</p></div>'}</div></section>` : `
      <section class="inventory-overview" aria-label="Couverture des inventaires"><div><strong>${SMUR_CONTAINERS.length}</strong><span>contenants PDF</span></div><div><strong>${chariots.length}</strong><span>chariots XLSX chargés</span></div><div><strong>${RESERVE_ZONE_IDS.length}</strong><span>réserves</span></div></section>
      <section class="section"><div class="section-head"><div><p class="section-eyebrow">Localiser dans le service</p><h2>Réserves</h2></div><span class="section-count">3 vues</span></div><div class="inventory-visual-grid reserves">${RESERVE_ZONE_IDS.map((zoneId) => findZone(zoneId)).filter(Boolean).map(renderReserveInventoryCard).join('')}</div></section>
      <section class="section"><div class="section-head"><div><p class="section-eyebrow">Compositions PDF · 361 lignes</p><h2>Sacs et contenants SMUR</h2></div><span class="section-count">${SMUR_CONTAINERS.length} inventaires</span></div><div class="inventory-visual-grid">${SMUR_CONTAINERS.map((container) => renderContainerInventoryCard(state, container)).join('')}</div></section>
      <section class="section"><div class="section-head"><div><p class="section-eyebrow">URG.ENR.007 V4 · sources XLSX de mars 2024</p><h2>Chariots d’urgence</h2></div><span class="section-count">${chariotItems.length} lignes</span></div>${chariots.length ? `<div class="inventory-visual-grid">${chariots.map(renderChariotInventoryCard).join('')}</div>` : `<div class="p0-reference-banner historical-warning">${icon('alert', 18)}<div><strong>Référentiel chariots indisponible</strong><span>Les 3 fichiers restent référencés mais leurs 357 lignes n’ont pas pu être chargées. Réessayez en ligne ou vérifiez le cache PWA.</span></div></div>`}</section>`}`;
}

function renderContainerDetail(state, containerId, sectionId) {
  const container = findContainer(containerId);
  if (!container) return `${header('Contenant introuvable', '', 'Erreur', 'inventory')}<div class="empty-state"><p>Ce contenant n’existe pas dans le référentiel chargé.</p></div>`;
  const diagram = getContainerDiagram(container);
  const source = SOURCE_DOCUMENTS.find((candidate) => candidate.id === container.sourceId);
  const selectedSection = findContainerSection(container, sectionId);
  const availability = deriveAvailability(container.id, state);
  const stockZone = findZone(container.stockZoneId);
  const itemCount = container.sections.reduce((sum, section) => sum + section.items.length, 0);
  const theoreticalTotal = theoreticalTotalForSections(container.sections);
  const routeForZone = (zone) => `container/${container.id}/${sectionToken(zone.targetId)}`;
  const statusForZone = (zone) => {
    if (openActionTouchesSection(state, container.id, zone.targetId)) return availability.status === 'indisponible' ? 'indisponible' : 'a_rearmer';
    return container.sections.find((section) => section.id === zone.targetId)?.sourceStatus === 'source-ambiguity-to-validate' ? 'a_verifier' : 'pret';
  };
  return `${header(container.label, `${itemCount} lignes d’inventaire · ${container.sections.length} zone${container.sections.length > 1 ? 's' : ''}.`, 'Schéma du contenant', 'inventory')}
    <section class="inventory-detail-summary">
      <div><span class="p0-bag-color" data-color="${escapeHtml(container.color)}">${icon('bag')}</span><span><strong>${escapeHtml(container.shortLabel)}</strong><small>${escapeHtml(container.kind)} · ${itemCount} lignes · total théorique ${theoreticalTotal} · affectation proposée : ${escapeHtml(stockZone?.label || 'non renseignée')} · à confirmer</small></span></div>
      ${statusPill(availability.status, availability.label)}
    </section>
    ${renderVisualSchema(diagram, { kind: 'container', label: container.label, color: container.color, selectedTargetId: selectedSection?.id || '', routeForZone, statusForZone })}
    <ol class="schema-zone-index" aria-label="Index des zones">${container.sections.map((section, index) => `<li class="${selectedSection?.id === section.id ? 'active' : ''}"><button type="button" data-nav="container/${container.id}/${sectionToken(section.id)}"><span>${index + 1}</span><span><strong>${escapeHtml(section.label)}</strong><small>${section.items.length} ligne${section.items.length > 1 ? 's' : ''}</small></span>${icon('chevron', 16)}</button></li>`).join('')}</ol>
    ${selectedSection ? `<section class="section inventory-section-detail"><div class="section-head"><div><p class="section-eyebrow">Zone ${container.sections.indexOf(selectedSection) + 1}</p><h2>${escapeHtml(selectedSection.label)}</h2></div><span class="section-count">${selectedSection.items.length} lignes</span></div><div class="inventory-line-list">${selectedSection.items.map((item) => `<div class="inventory-line"><span class="inventory-quantity">${Number(item.expectedQuantity)}×</span><span><strong>${escapeHtml(item.label)}</strong>${itemHasSourceAmbiguity(item) ? `<span class="data-quality-badge">${icon('alert', 12)} Libellé source à valider</span>` : ''}<small>${escapeHtml(item.category)} · unité : ${escapeHtml(item.unit)}${item.packSize ? ` · ${item.packSize} par paquet` : ''}${item.expiryTracked ? ' · péremption suivie' : ' · réutilisable'}</small>${(item.validationIssues || []).map((issue) => `<small class="inventory-validation-issue">${escapeHtml(issue)}</small>`).join('')}${item.sourceText ? `<small class="inventory-source-text">Source : ${escapeHtml(item.sourceText)}</small>` : ''}</span></div>`).join('')}</div><div class="inventory-detail-actions"><button type="button" class="primary-button" data-return-container="${container.id}" data-return-section="${selectedSection.id}">${icon('plus', 18)} Déclarer cette zone ouverte ou utilisée</button><button type="button" class="secondary-button" data-start-audit="${container.id}" data-audit-section="${selectedSection.id}">${icon('clipboard', 18)} Contrôler cette zone</button></div></section>` : `<div class="schema-guidance">${icon('bag', 20)}<div><strong>Touchez une zone du schéma</strong><span>Vous n’afficherez alors que le kit ou compartiment concerné, sans parcourir une longue liste.</span></div></div>`}
    <details class="p0-details"><summary>Source, version et limites</summary><div><p><strong>${escapeHtml(source?.documentRef || source?.id || 'Source non renseignée')}</strong> · ${escapeHtml(source?.fileName || '')}<br><small>${escapeHtml(source?.revision || 'révision inconnue')} · ${escapeHtml(source?.sourceDate || 'date inconnue')} · ${escapeHtml(source?.status || container.sourceStatus || 'imported-from-source')}</small></p><p><strong>Schéma ${escapeHtml(diagram.version)}</strong><br><small>${isPhysicalLayoutValidated(diagram, container) ? 'Organisation visuelle validée.' : 'Organisation visuelle à préciser. '}${diagram.layoutMode === 'semantic-override' ? 'Disposition déduite uniquement des intitulés de zones.' : diagram.layoutMode === 'inventory-placeholder' ? 'Aucune position interne n’est déduite : la zone ouvre seulement l’inventaire sourcé.' : 'Grille fonctionnelle générée, non représentative du rangement réel.'}</small></p></div></details>`;
}

function renderReserveDetail(state, reserveId) {
  const zone = findZone(reserveId);
  if (!zone || !RESERVE_ZONE_IDS.includes(zone.id)) return `${header('Réserve introuvable', '', 'Erreur', 'inventory')}`;
  const operationalAssets = realRecords(OPERATIONAL_ASSETS);
  const diagram = getReserveDiagram(zone.id, SMUR_CONTAINERS, operationalAssets);
  const knownContainers = SMUR_CONTAINERS.filter((container) => container.stockZoneId === zone.id);
  const knownAssets = operationalAssets.filter((asset) => asset.homeZoneId === zone.id);
  return `${header(zone.label, 'Vue de repérage fondée uniquement sur les rattachements de zone connus.', 'Schéma de réserve', 'inventory')}
    <p class="reserve-layout-note">Organisation visuelle à préciser · armoires, étagères et bacs à relever sur place.</p>
    ${renderVisualSchema(diagram, {
      kind: 'reserve', label: zone.label,
      routeForZone: (schemaZone) => findContainer(schemaZone.targetId) ? `container/${schemaZone.targetId}` : ''
    })}
    <section class="physical-data-grid" aria-label="Données physiques à compléter"><div>${icon('map', 18)}<span><strong>Photo générale</strong><small>À ajouter</small></span></div><div>${icon('alert', 18)}<span><strong>Armoires</strong><small>À numéroter</small></span></div><div>${icon('alert', 18)}<span><strong>Étagères</strong><small>À relever</small></span></div><div>${icon('alert', 18)}<span><strong>Bacs</strong><small>À localiser</small></span></div></section>
    <section class="section"><div class="section-head"><h2>Matériel rattaché provisoirement à cette zone</h2><span class="section-count">${knownContainers.length + knownAssets.length}</span></div><div class="reserve-known-list">${knownContainers.map((container) => `<button type="button" data-nav="container/${container.id}"><span class="p0-color-dot" data-color="${escapeHtml(container.color)}"></span><span><strong>${escapeHtml(container.label)}</strong><small>${container.sections.reduce((sum, section) => sum + section.items.length, 0)} lignes · rattachement et position à confirmer</small></span>${icon('chevron', 17)}</button>`).join('')}${knownAssets.map((asset) => `<div><span class="asset-symbol">${icon('activity', 18)}</span><span><strong>${escapeHtml(asset.label)}</strong><small>Emplacement physique à confirmer</small></span>${statusPill('a_verifier', 'À localiser')}</div>`).join('') || ''}</div></section>
    <div class="schema-guidance">${icon('alert', 20)}<div><strong>Stock de réarmement non cartographié</strong><span>La réserve, l’armoire, l’étagère et le bac de chaque produit devront être ajoutés après validation humaine.</span></div></div>`;
}

function renderChariotDetail(state, referenceId, sectionId) {
  const reference = state.chariotReference?.references?.find((candidate) => candidate.id === referenceId);
  if (!reference) return `${header('Chariot introuvable', '', 'Erreur', 'inventory')}`;
  const diagram = getChariotDiagram(reference);
  const selectedSection = findChariotSection(reference, sectionId);
  const itemCount = reference.containers.reduce((sum, container) => sum + container.items.length, 0);
  const theoreticalTotal = theoreticalTotalForSections(reference.containers);
  const annotations = selectedSection?.sourceAnnotations || [];
  return `${header(reference.label, `${itemCount} lignes importées · ${reference.containers.length} sections · total théorique ${theoreticalTotal}.`, 'Référentiel actif', 'inventory')}
    <section class="inventory-detail-summary"><div><span class="p0-bag-color" data-color="non-renseignee">${icon('clipboard')}</span><span><strong>${escapeHtml(reference.documentRef || 'Référence source non renseignée')} ${escapeHtml(reference.revision || '')}</strong><small>${escapeHtml(reference.sourceDate || 'date source non renseignée')} · ${escapeHtml(reference.sourceStatus || 'imported-from-source')}</small></span></div>${statusPill('disponible', 'Inventaire actif')}</section>
    ${renderVisualSchema(diagram, { kind: 'chariot', label: reference.label, selectedTargetId: selectedSection?.id || '', routeForZone: (zone) => `chariot/${reference.id}/${zone.targetId}` })}
    <p class="reserve-layout-note">${isPhysicalLayoutValidated(diagram, reference) ? 'Organisation visuelle validée' : 'Organisation visuelle à préciser'}</p>
    <ol class="schema-zone-index chariot-index">${reference.containers.map((container, index) => `<li class="${selectedSection?.id === container.id ? 'active' : ''}"><button type="button" data-nav="chariot/${reference.id}/${container.id}"><span>${index + 1}</span><span><strong>${escapeHtml(container.label)}</strong><small>${container.items.length} lignes${container.sourceAnnotations?.length ? ` · ${container.sourceAnnotations.length} libellé${container.sourceAnnotations.length > 1 ? 's' : ''} source à valider` : ''}</small></span>${icon('chevron', 16)}</button></li>`).join('')}</ol>
    ${selectedSection ? `<section class="section inventory-section-detail"><div class="section-head"><h2>${escapeHtml(selectedSection.label)}</h2><span class="section-count">${selectedSection.items.length} lignes actives</span></div><div class="inventory-line-list">${selectedSection.items.map((item) => `<div class="inventory-line"><span class="inventory-quantity">${Number(item.expectedQuantity)}×</span><span><strong>${escapeHtml(item.label)}</strong>${item.sourceStatus === 'source-ambiguity-to-validate' ? `<span class="data-quality-badge">${icon('alert', 12)} Libellé source à valider</span>` : ''}<small>${item.presentation ? `${escapeHtml(item.presentation)} · ` : ''}${item.productCode ? `Code ${escapeHtml(item.productCode)} · ` : ''}cellule source ${escapeHtml(item.sourceCell || 'inconnue')}</small></span></div>`).join('')}</div>${annotations.length ? `<aside class="source-annotation-list" aria-label="Libellés source à valider"><h3>Libellés source à valider</h3>${annotations.map((annotation) => `<div class="source-annotation"><span>${icon('alert', 15)}</span><div><strong>${escapeHtml(annotation.label || annotation.sourceText || annotation.rawLabel || 'Ligne source à valider')}</strong><small>${escapeHtml(annotation.sourceCell ? `Cellule ${annotation.sourceCell} · ` : '')}quantité source ${Number(annotation.expectedQuantitySource ?? annotation.expectedQuantity ?? annotation.quantity ?? annotation.rawQuantity ?? 0)} · non activée dans le total théorique</small><small>${escapeHtml((annotation.validationIssues || []).join(' · ') || annotation.validationIssue || annotation.reason || 'Quantité source non positive à confirmer')}</small><code>source-ambiguity-to-validate</code></div></div>`).join('')}</aside>` : ''}</section>` : `<div class="schema-guidance">${icon('clipboard', 20)}<div><strong>Sélectionnez un tiroir ou un plateau</strong><span>L’inventaire actif de la section s’affichera, avec ses éventuelles ambiguïtés source conservées séparément.</span></div></div>`}`;
}

function renderActions(state, ui) {
  const filter = ui.actionFilter || 'open';
  const actions = state.actions.filter((action) => filter === 'all' || (filter === 'done' ? action.status === 'done' : !['done', 'cancelled'].includes(action.status)));
  return `${header('Actions', 'File locale issue des déclarations, contrôles, défauts et péremptions.', 'File opérationnelle')}
    <div class="p0-tabs"><button data-action-filter="open" class="${filter === 'open' ? 'active' : ''}">Ouvertes</button><button data-action-filter="done" class="${filter === 'done' ? 'active' : ''}">Clôturées</button><button data-action-filter="all" class="${filter === 'all' ? 'active' : ''}">Toutes</button></div>
    <div class="action-list">${actions.length ? actions.map(actionCard).join('') : '<div class="empty-state"><h3>Aucune action</h3><p>La sélection courante ne contient aucun élément.</p></div>'}</div>
    <button class="secondary-button p0-full" data-nav="defect">${icon('activity', 18)} Signaler un défaut fonctionnel</button>`;
}

function stageText(action) {
  if (action.status === 'done') return 'Clôturée';
  if (!action.stage || action.stage === 'collecte') return 'Collecte';
  if (action.stage === 'verification') return 'Vérification';
  if (action.stage === 'remise_en_place') return 'Remise en place';
  return action.stage;
}

function renderActionDetail(state, id) {
  const action = state.actions.find((candidate) => candidate.id === id);
  if (!action) return `${header('Action introuvable', '', 'Erreur', 'actions')}<div class="empty-state"><p>Cette action n’existe plus localement.</p></div>`;
  if (action.type === 'remplacement_peremption' && action.lotId) return renderExpiryDetail(state, action.lotId);
  const container = findContainer(action.containerId);
  const effectiveZoneId = actionZoneId(action);
  const zone = findZone(effectiveZoneId);
  const targetLocationReady = action.targetZoneStatus === 'validated' && Boolean(findZone(action.targetZoneId));
  const finalLocationReady = action.finalZoneStatus === 'validated' && Boolean(findZone(action.finalZoneId));
  const allDone = !action.lines?.length || action.lines.every((line) => line.done);
  const stages = ['Collecte', 'Vérification', 'Remise en place', 'Clôture'];
  const stageIndex = action.status === 'done' ? 4 : !action.stage || action.stage === 'collecte' ? 0 : action.stage === 'verification' ? 1 : 2;
  const requiredLocationReady = action.type === 'controle' || (stageIndex === 0 ? targetLocationReady : finalLocationReady);
  const nextLabel = stageIndex === 0 ? 'Passer à la vérification' : stageIndex === 1 ? 'Confirmer la remise en place' : 'Clôturer l’action';
  return `${header(action.title, container?.label || 'Action importée', 'Action opérationnelle', 'actions')}
    ${action.status !== 'done' && !requiredLocationReady ? `<div class="p0-reference-banner route-location-warning">${icon('alert', 18)}<div><strong>Étape bloquée · emplacement à confirmer</strong><span>${stageIndex === 0 ? 'La réserve, l’armoire, l’étagère et le bac de prélèvement doivent être validés.' : 'La destination finale du contenant doit être validée.'}</span></div></div>` : ''}
    <section class="p0-action-hero ${action.priority === 'critique' ? 'danger' : ''}"><div>${statusPill(action.status === 'done' ? 'pret' : 'a_verifier', action.status === 'done' ? 'Clôturée' : action.priority)}<h2>${escapeHtml(stageText(action))}</h2><p>${zone ? `${escapeHtml(zone.label)} · ${escapeHtml(zone.detail)}` : 'Emplacement opérationnel à confirmer'}</p></div><button class="icon-button" data-nav="map" aria-label="Voir sur le plan">${icon('map')}</button></section>
    <ol class="p0-stagebar">${stages.map((label, index) => `<li class="${index < stageIndex ? 'done' : index === stageIndex ? 'active' : ''}"><span>${index < stageIndex ? '✓' : index + 1}</span><small>${label}</small></li>`).join('')}</ol>
    ${action.type === 'controle' && action.status !== 'done' ? `<button class="primary-button p0-full" data-start-audit="${action.containerId}" data-origin-action="${action.id}">${icon('clipboard', 18)} Démarrer le contrôle du contenant</button>` : ''}
    ${action.lines?.length ? `<section class="section"><div class="section-head"><h2>Lignes à traiter</h2></div><div class="card">${action.lines.map((line) => { const item = findReferenceItem(line.itemId); return `<button class="p0-check-row ${line.done ? 'done' : ''}" data-toggle-line="${action.id}" data-item-id="${line.itemId}" ${action.status === 'done' || !targetLocationReady ? 'disabled' : ''}><span class="p0-checkmark">${line.done ? icon('check', 16) : ''}</span><span><strong>${line.quantity} × ${escapeHtml(item?.label || line.itemId)}</strong><small>${escapeHtml(item?.sectionLabel || container?.label)}</small></span></button>`; }).join('')}</div></section>` : ''}
    ${action.status !== 'done' && action.type === 'remplacement_peremption' && action.stage === 'remise_en_place' && finalLocationReady ? `<form id="expiry-completion-form" class="p0-form card card-pad"><input type="hidden" name="actionId" value="${action.id}"><label class="p0-field"><span>Nouveau numéro de lot</span><input name="lotNumber" required autocomplete="off"></label><label class="p0-field"><span>Nouvelle péremption (mois/année)</span><input type="month" name="expiryMonth" required></label><label class="p0-field"><span>Quantité du nouveau lot</span><input type="number" min="1" step="1" name="quantity" value="${action.lines?.[0]?.quantity || 1}" required></label><button class="primary-button" type="submit">Enregistrer le lot et clôturer</button></form>` : ''}
    ${action.status !== 'done' && action.type !== 'controle' && !(action.type === 'remplacement_peremption' && action.stage === 'remise_en_place') ? `<button class="primary-button p0-full" data-advance-action="${action.id}" ${allDone && requiredLocationReady ? '' : 'disabled'}>${nextLabel}</button>` : ''}
    ${action.status === 'done' ? `<div class="success-banner">${icon('check', 18)}<div><strong>Action clôturée</strong>Le journal conserve la date, l’utilisateur local et l’événement de résolution.</div></div>` : ''}`;
}

function renderAudits(state) {
  const current = state.audits.filter((audit) => audit.status === 'in_progress');
  return `${header('Contrôles', 'Choisissez un contenant. Chaque observation est enregistrée immédiatement.', 'Contrôle périodique', 'actions')}
    ${current.length ? `<section class="section"><div class="section-head"><h2>À reprendre</h2></div>${current.map((audit) => `<button class="p0-resume-card" data-resume-audit="${audit.id}"><span>${icon('clipboard')}</span><span><strong>${escapeHtml(audit.sectionLabel ? `${audit.containerLabel} · ${audit.sectionLabel}` : audit.containerLabel)}</strong><small>${audit.pausedAt ? 'En pause' : 'En cours'} · dernière saisie ${escapeHtml(formatRelative(audit.updatedAt))}</small></span>${icon('chevron', 18)}</button>`).join('')}</section>` : ''}
    <section class="section"><div class="section-head"><h2>Nouveau contrôle</h2></div><div class="p0-container-grid">${SMUR_CONTAINERS.map((container) => `<article class="p0-container-card"><div class="p0-container-head"><span class="p0-bag-color" data-color="${container.color}">${icon('bag')}</span><div><h3>${escapeHtml(container.label)}</h3><p>${container.sections.reduce((sum, section) => sum + section.items.length, 0)} éléments</p></div></div><button class="secondary-button p0-full" data-start-audit="${container.id}">Commencer</button></article>`).join('')}</div></section>`;
}

function renderAuditDetail(state, auditId) {
  const audit = state.audits.find((candidate) => candidate.id === auditId);
  const container = findContainer(audit?.containerId);
  if (!audit || !container) return `${header('Contrôle introuvable', '', 'Erreur', 'audits')}`;
  const diagram = getContainerDiagram(container);
  const observations = state.observations.filter((observation) => observation.auditId === auditId);
  const observedMap = new Map(observations.map((observation) => [observation.itemId, observation]));
  const planned = new Set(audit.plannedItemIds || []);
  const items = container.sections.flatMap((section) => section.items.map((item) => ({ ...item, sectionLabel: section.label }))).filter((item) => planned.has(item.id));
  const current = items.find((item) => !observedMap.has(item.id));
  const progress = Math.round((observations.length / items.length) * 100);
  if (!current) return `${header('Contrôle terminé', container.label, 'Clôture', 'audits')}<div class="p0-progress"><span style="width:100%"></span></div><div class="success-banner">${icon('check', 18)}<div><strong>${items.length} éléments renseignés</strong>Les écarts ont généré leurs actions sans attendre la clôture.</div></div><button class="primary-button p0-full" data-complete-audit="${audit.id}" ${audit.status === 'completed' ? 'disabled' : ''}>${audit.status === 'completed' ? 'Contrôle clôturé' : 'Clôturer le contrôle'}</button>`;
  return `${header('Contrôle en cours', container.label, current.sectionLabel, 'audits')}
    <div class="p0-progress-head"><strong>${observations.length} / ${items.length}</strong><span>${progress} %</span></div><div class="p0-progress"><span style="width:${progress}%"></span></div>
    ${renderVisualSchema(diagram, { kind: 'container', label: container.label, color: container.color, selectedTargetId: current.sectionId })}
    ${state.users.some((user) => user.active) ? `<details class="p0-details p0-assignment"><summary>Attribution · ${escapeHtml(state.users.find((user) => user.id === audit.userId)?.displayName || 'Utilisateur local')}</summary><form id="audit-assignment-form" class="p0-form"><input type="hidden" name="auditId" value="${audit.id}"><label class="p0-field"><span>Transmettre à</span><select name="userId">${state.users.filter((user) => user.active).map((user) => `<option value="${user.id}" ${user.id === audit.userId ? 'selected' : ''}>${escapeHtml(user.displayName)} · ${escapeHtml(user.role)}</option>`).join('')}</select></label><label class="p0-field"><span>Motif factuel (facultatif)</span><input name="reason" placeholder="Indiquer le motif de la passation"></label><button class="secondary-button" type="submit">Enregistrer la passation</button></form></details>` : ''}
    <article class="p0-audit-card"><span class="p0-counter">Élément ${observations.length + 1}</span><h2>${escapeHtml(current.label)}</h2><p>Quantité attendue : <strong>${current.expectedQuantity}</strong></p>
      <button class="p0-conform-button" data-observe-conforme="${audit.id}" data-item-id="${current.id}">${icon('check', 20)} Conforme · quantité attendue présente</button>
      <form id="observation-form" class="p0-form compact">
        <input type="hidden" name="auditId" value="${audit.id}"><input type="hidden" name="itemId" value="${current.id}">
        <label class="p0-field"><span>Autre résultat</span><select name="result" required><option value="manquant">Manquant</option><option value="quantite_incorrecte">Quantité incorrecte</option><option value="perime">Périmé</option><option value="defectueux">Défectueux</option><option value="non_applicable">Non applicable</option></select></label>
        <label class="p0-field"><span>Quantité observée</span><input type="number" min="0" step="1" name="observedQuantity" value="0" inputmode="numeric"></label>
        <label class="p0-field"><span>Niveau de disponibilité</span><select name="severity"><option value="attention">Attention</option><option value="bloquant">Bloquant — décidé par l’utilisateur</option></select></label>
        <label class="p0-field"><span>Note factuelle</span><textarea name="note" rows="2"></textarea></label>
        <button class="secondary-button" type="submit">Enregistrer cet écart</button>
      </form>
    </article>
    <button class="text-button p0-full" data-pause-audit="${audit.id}">Mettre en pause et revenir plus tard</button>`;
}

function productVisualKind(item) {
  const text = normalizeSearch(`${item?.label || ''} ${item?.category || ''}`);
  if (/nacl|serum|solut|perfusion|gelofusine|bicarbonate|glucose/.test(text)) return 'infusion';
  if (/compresse|pansement|sparadrap|tegaderm|bande|meche/.test(text)) return 'dressing';
  if (/masque|oxygene|respir|intub|canule|ventoline|aerosol/.test(text)) return 'respiratory';
  if (item?.category === 'medicament' || /ampoule|inject|seringue pre-remplie/.test(text)) return 'injectable';
  if (['dispositif', 'equipement'].includes(item?.category)) return 'device';
  return 'initials';
}

function itemHasSourceAmbiguity(item) {
  return item?.sourceStatus === 'source-ambiguity-to-validate' || Boolean(item?.validationIssues?.length);
}

function productInitials(label) {
  return String(label || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function expiryPictogram(item) {
  const kind = productVisualKind(item);
  if (kind === 'initials') return `<span class="expiry-product-initials" aria-hidden="true">${escapeHtml(productInitials(item?.label))}</span>`;
  const paths = {
    injectable: '<path d="m7 17 9-9M14 6l4 4M5 19l2-2M9 10l5 5M15 5l4-2 2 2-2 4"/>',
    infusion: '<path d="M8 3h8v4l2 3v10H6V10l2-3V3ZM8 8h8M9 13h6M12 13v4"/>',
    dressing: '<rect x="4" y="7" width="16" height="10" rx="3"/><path d="M9 7v10M15 7v10M10.5 12h3"/>',
    respiratory: '<path d="M5 9c2-3 12-3 14 0v7c-2 3-5 4-7 4s-5-1-7-4V9Z"/><path d="M8 11h8M8 14h8M5 10 2 8M19 10l3-2"/>',
    device: '<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 9h8M8 13h5M8 17h8"/>'
  };
  return `<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
}

function daysLabel(daysRemaining) {
  if (!Number.isFinite(daysRemaining)) return 'Date à vérifier';
  if (daysRemaining < 0) return `Périmé depuis ${Math.abs(daysRemaining)} j`;
  if (daysRemaining === 0) return 'Échéance aujourd’hui';
  return `${daysRemaining} j restants`;
}

function lotLocation(lot, item) {
  const container = findContainer(lot.containerId || item?.containerId);
  const section = findContainerSection(container, lot.sectionId || item?.sectionId);
  return {
    container,
    section,
    containerLabel: lot.containerLabel || container?.label || item?.containerLabel || 'Contenant à confirmer',
    sectionLabel: lot.locationLabel || lot.sectionLabel || section?.label || item?.sectionLabel || 'Zone à préciser'
  };
}

function renderExpiryPanel({ id, tone, iconName, label, count, subtitle }, activeFilter) {
  const selected = activeFilter === id;
  return `<button type="button" class="expiry-panel ${tone} ${selected ? 'is-active' : ''}" data-expiry-filter="${id}" aria-pressed="${selected}" aria-label="Filtrer : ${escapeHtml(label)}, ${count}">
    <span class="expiry-panel-icon">${icon(iconName, 23)}</span><span class="expiry-panel-count">${count}</span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(subtitle)}</small>
  </button>`;
}

function renderExpiryProductCard(lot) {
  const item = lot.item || findReferenceItem(lot.itemId);
  const location = lotLocation(lot, item);
  const tone = lot.bucket === 'urgent' ? 'red' : lot.bucket === 'soon' ? 'orange' : lot.bucket === 'anticipate' ? 'violet' : lot.bucket === 'treated' ? 'green' : 'neutral';
  const actionLabel = lot.bucket === 'treated' ? 'Voir' : lot.bucket === 'monitor' ? 'Consulter' : 'Traiter';
  return `<article class="expiry-product-card ${tone}" data-expiry-bucket="${escapeHtml(lot.bucket)}">
    <span class="expiry-product-icon">${expiryPictogram(item)}</span>
    <div class="expiry-product-copy"><strong>${escapeHtml(item?.label || 'Produit du référentiel')}</strong><small>${escapeHtml(item?.category || 'Catégorie à déterminer')}</small><span>${escapeHtml(location.containerLabel)} › ${escapeHtml(location.sectionLabel)}</span><span>Lot ${escapeHtml(lot.lotNumber)} · ${escapeHtml(formatDate(lot.expiryDate, { month: '2-digit', year: 'numeric' }))}</span></div>
    <div class="expiry-product-status"><strong>${escapeHtml(lot.bucket === 'treated' ? 'Traité ce mois' : daysLabel(lot.daysRemaining))}</strong><small>${escapeHtml(lot.bucket === 'urgent' ? 'Action prioritaire' : lot.bucket === 'soon' ? 'Remplacement rapide' : lot.bucket === 'anticipate' ? 'À anticiper' : lot.bucket === 'treated' ? 'Historique conservé' : 'Surveillance simple')}</small></div>
    <button type="button" class="expiry-product-action" data-nav="expiry/lot/${encodeURIComponent(lot.id)}">${actionLabel}${icon('chevron', 16)}</button>
  </article>`;
}

function renderExpiryDashboard(state, ui) {
  const { active, workflow, treated, thresholds } = expiryModels(state);
  const tracked = [...workflow, ...active];
  const groups = {
    urgent: tracked.filter((lot) => lot.bucket === 'urgent'),
    soon: tracked.filter((lot) => lot.bucket === 'soon'),
    anticipate: tracked.filter((lot) => lot.bucket === 'anticipate'),
    treated
  };
  const filter = ['urgent', 'soon', 'anticipate', 'treated'].includes(ui.expiryFilter) ? ui.expiryFilter : 'all';
  const shown = filter === 'all' ? tracked : groups[filter];
  const panels = [
    { id: 'urgent', tone: 'red', iconName: 'alert', label: 'À traiter', count: distinctProductCount(groups.urgent), subtitle: 'Actions prioritaires' },
    { id: 'soon', tone: 'orange', iconName: 'clock', label: '≤ 30 jours', count: distinctProductCount(groups.soon), subtitle: 'Remplacement rapide' },
    { id: 'anticipate', tone: 'violet', iconName: 'calendar', label: '31–90 jours', count: distinctProductCount(groups.anticipate), subtitle: 'À anticiper' },
    { id: 'treated', tone: 'green', iconName: 'check', label: 'Traité ce mois', count: distinctProductCount(groups.treated), subtitle: 'Conformité retrouvée' }
  ];
  return `${header('Péremptions', 'Suivi des lots réellement saisis dans les sacs et réserves.', 'Stock vivant')}
    <section class="expiry-panel-grid" aria-label="Filtres de suivi des péremptions">${panels.map((panel) => renderExpiryPanel(panel, filter)).join('')}</section>
    <p class="expiry-logistics-note">Seuils logistiques configurables : action immédiate ≤ ${thresholds.urgentDays} j, remplacement rapide ≤ ${thresholds.rapidReplacementDays} j, anticipation ≤ ${thresholds.anticipationDays} j. Ces paramètres ne constituent pas une règle médicale.</p>
    <details class="expiry-threshold-settings"><summary>${icon('settings', 17)} Paramètres logistiques</summary><form id="expiry-thresholds-form" class="p0-form"><div class="expiry-threshold-grid"><label class="p0-field"><span>Action immédiate</span><input type="number" name="urgentDays" min="0" step="1" inputmode="numeric" value="${thresholds.urgentDays}" required><small>jours</small></label><label class="p0-field"><span>Remplacement rapide</span><input type="number" name="rapidReplacementDays" min="0" step="1" inputmode="numeric" value="${thresholds.rapidReplacementDays}" required><small>jours</small></label><label class="p0-field"><span>Anticipation</span><input type="number" name="anticipationDays" min="0" step="1" inputmode="numeric" value="${thresholds.anticipationDays}" required><small>jours</small></label><label class="p0-field"><span>Surveillance simple</span><input type="number" name="monitoringDays" min="0" step="1" inputmode="numeric" value="${thresholds.monitoringDays}" required><small>jours</small></label></div><p>Paramètres logistiques locaux, sans portée médicale ou pharmaceutique officielle.</p><button type="submit" class="secondary-button">Enregistrer les seuils</button></form></details>
    ${!tracked.length && !treated.length ? `<section class="expiry-empty-state"><span>${icon('calendar', 34)}</span><h2>Aucun lot enregistré</h2><p>Les inventaires sont disponibles. Ajoutez les lots et les dates réellement présents dans les sacs et réserves pour activer le suivi des péremptions.</p><div><button type="button" class="primary-button" data-nav="expiry/add">Commencer la saisie</button><button type="button" class="secondary-button" data-nav="expiry/add" data-focus-expiry-search="true">Scanner ou rechercher un produit</button><button type="button" class="text-button" data-nav="inventory">Voir les inventaires</button></div></section>` : `<section class="section expiry-results"><div class="section-head"><h2>${filter === 'all' ? 'Lots suivis' : panels.find((panel) => panel.id === filter)?.label}</h2><span class="section-count">${shown.length}</span></div><div class="expiry-product-list">${shown.map(renderExpiryProductCard).join('') || '<div class="empty-state"><h3>Aucun lot dans ce filtre</h3><p>Les autres lots suivis restent disponibles.</p><button type="button" class="small-button" data-expiry-filter="all">Afficher tous les lots</button></div>'}</div></section>`}
    <button type="button" class="primary-button expiry-add-button" data-nav="expiry/add">${icon('plus', 18)} Ajouter un lot</button>`;
}

function renderExpiryAdd(state, ui) {
  const query = normalizeSearch(ui.expirySearch || '');
  const expiryItems = activeReferenceItems(state);
  const selectedItem = expiryItems.find((item) => item.id === ui.expiryItemId || item.rawItemId === ui.expiryItemId);
  const results = query
    ? expiryItems.filter((item) => item.expiryTracked !== false && normalizeSearch(`${item.label} ${item.containerLabel} ${item.sectionLabel} ${item.sourceText || ''} ${item.productCode || ''}`).includes(query)).slice(0, 40)
    : [];
  const selectedContainer = findContainer(selectedItem?.containerId);
  const selectedChariot = selectedItem?.referenceType === 'xlsx'
    ? state.chariotReference?.references?.find((reference) => reference.id === selectedItem.containerId)
    : null;
  const selectedSection = selectedContainer?.sections.find((section) => section.id === selectedItem?.sectionId)
    || selectedChariot?.containers?.find((section) => section.id === selectedItem?.sectionId);
  const selectedSource = SOURCE_DOCUMENTS.find((source) => source.id === (selectedItem?.sourceId || selectedContainer?.sourceId));
  const selectedContainerLabel = selectedContainer?.label || selectedChariot?.label || selectedItem?.containerLabel;
  const selectedLayoutStatus = selectedContainer?.physicalLayoutStatus || selectedChariot?.physicalLayoutStatus || selectedItem?.physicalLayoutStatus || 'physical-layout-provisional';
  return `${header('Ajouter un lot', 'Recherchez le produit dans le référentiel puis saisissez uniquement les données constatées.', 'Péremptions', 'expiry')}
    <ol class="expiry-entry-steps" aria-label="Étapes de saisie"><li class="active"><span>1</span>Produit</li><li class="${selectedItem ? 'active' : ''}"><span>2</span>Emplacement</li><li class="${selectedItem ? 'active' : ''}"><span>3</span>Lot et date</li><li class="${selectedItem ? 'active' : ''}"><span>4</span>Enregistrer</li></ol>
    <label class="p0-search expiry-reference-search">${icon('search', 19)}<span class="sr-only">Rechercher un produit</span><input id="expiry-reference-search" type="search" value="${escapeHtml(ui.expirySearch || '')}" placeholder="Nom, dosage, format ou contenant…" autocomplete="off" autofocus></label>
    ${query && !selectedItem ? `<section class="section"><div class="section-head"><h2>Produits du référentiel</h2><span class="section-count">${results.length}</span></div><div class="expiry-reference-results">${results.map((item) => `<button type="button" data-select-expiry-item="${escapeHtml(item.id)}"><span class="expiry-product-icon">${expiryPictogram(item)}</span><span><strong>${escapeHtml(item.label)}</strong>${itemHasSourceAmbiguity(item) ? '<small class="inventory-validation-issue">Libellé source à valider</small>' : ''}<small>${escapeHtml(item.containerLabel)} › ${escapeHtml(item.sectionLabel)}</small><small>Quantité théorique : ${Number(item.expectedQuantity)} · ${escapeHtml(item.unit)}</small></span>${icon('chevron', 17)}</button>`).join('') || '<div class="empty-state"><h3>Aucun produit trouvé</h3><p>Vérifiez le libellé ou consultez tous les inventaires.</p><button type="button" class="small-button" data-nav="inventory">Voir les inventaires</button></div>'}</div></section>` : ''}
    ${selectedItem ? `<form id="expiry-lot-form" class="p0-form card card-pad expiry-lot-form">
      <input type="hidden" name="itemId" value="${escapeHtml(selectedItem.id)}"><input type="hidden" name="containerId" value="${escapeHtml(selectedItem.containerId)}"><input type="hidden" name="sectionId" value="${escapeHtml(selectedItem.sectionId)}"><input type="hidden" name="locationStatus" value="${escapeHtml(selectedLayoutStatus)}">
      <section class="expiry-selected-reference"><span class="expiry-product-icon">${expiryPictogram(selectedItem)}</span><div><p>Produit sélectionné</p><strong>${escapeHtml(selectedItem.label)}</strong>${itemHasSourceAmbiguity(selectedItem) ? '<small class="inventory-validation-issue">Libellé source à valider</small>' : ''}<small>Quantité théorique : ${Number(selectedItem.expectedQuantity)} · ${escapeHtml(selectedItem.unit)}</small><small>Source : ${escapeHtml(selectedSource?.documentRef || selectedItem.sourceReference || selectedItem.sourceId || 'document importé')} · ${escapeHtml(selectedSource?.revision || selectedItem.sourceRevision || 'version source')}</small></div><button type="button" class="text-button" data-clear-expiry-item="true">Changer</button></section>
      <label class="p0-field"><span>2. Choisir son emplacement</span><select name="locationId" required><option value="${escapeHtml(selectedItem.sectionId)}">${escapeHtml(selectedContainerLabel)} › ${escapeHtml(selectedSection?.label || selectedItem.sectionLabel || 'Zone à préciser')}</option></select><small class="field-help">${selectedLayoutStatus === 'physical-layout-validated' ? 'Organisation visuelle validée' : 'Organisation visuelle à préciser'}</small></label>
      <label class="p0-field"><span>3. Numéro de lot</span><input name="lotNumber" required autocomplete="off" autocapitalize="characters"></label>
      <label class="p0-field"><span>4. Mois / année de péremption</span><input type="month" name="expiryMonth" required></label>
      <label class="p0-field"><span>5. Quantité réellement présente</span><input type="number" name="quantity" min="1" step="1" inputmode="numeric" required></label>
      <p class="expiry-data-separation">La quantité théorique reste dans le référentiel. Ce formulaire enregistre uniquement le lot, la date et la quantité réellement constatés.</p>
      <button type="submit" class="primary-button">Enregistrer</button>
    </form>` : !query ? '<div class="schema-guidance"><span aria-hidden="true">1</span><div><strong>Rechercher le produit</strong><span>Le nom, le dosage et la quantité théorique seront repris du référentiel sans ressaisie.</span></div></div>' : ''}`;
}

function workflowStage(action) {
  if (action?.status === 'done' || action?.stage === 'done') return 4;
  if (!action) return 0;
  const stage = action.expiryStage || action.stage;
  if (['validated', 'valide'].includes(stage)) return 4;
  if (['valider', 'replacement-recorded', 'remplacement_enregistre', 'remise_en_place'].includes(stage)) return 3;
  if (['remplacer', 'removed', 'retrait_enregistre', 'verification'].includes(stage)) return 2;
  if (['retirer', 'collecte'].includes(stage)) return 1;
  return 0;
}

function renderExpiryWorkflow(state, lot) {
  const item = lot.item || activeReferenceItem(state, lot.itemId, lot);
  const location = lotLocation(lot, item);
  const action = state.actions.find((candidate) => candidate.lotId === lot.id && !['cancelled'].includes(candidate.status));
  const stage = lot.bucket === 'treated' ? 4 : workflowStage(action);
  const chariot = item?.referenceType === 'xlsx'
    ? state.chariotReference?.references?.find((reference) => reference.id === item.containerId)
    : null;
  const diagram = location.container ? getContainerDiagram(location.container) : chariot ? getChariotDiagram(chariot) : null;
  const removal = action?.expiryRemoval || action?.removal || {};
  const replacement = action?.expiryReplacement || action?.replacement || {};
  const step = (index, title, description, content) => `<section class="expiry-workflow-step ${index < stage ? 'is-done' : index === stage ? 'is-current' : 'is-pending'}"><header><span>${index < stage || stage === 4 ? icon('check', 17) : index + 1}</span><div><h2>${title}</h2><p>${description}</p></div></header>${index === 0 || index === stage || (stage === 4 && index === 3) ? `<div class="expiry-workflow-body">${content}</div>` : ''}</section>`;
  const localizeContent = `<dl class="expiry-location-path"><div><dt>Contenant</dt><dd>${escapeHtml(location.containerLabel)}</dd></div><div><dt>Kit ou compartiment</dt><dd>${escapeHtml(location.sectionLabel)}</dd></div><div><dt>Réserve éventuelle</dt><dd>${escapeHtml(findZone(location.container?.stockZoneId)?.label || 'Emplacement physique à confirmer')}</dd></div></dl>${diagram ? renderVisualSchema(diagram, { kind: chariot ? 'chariot' : 'container', label: location.containerLabel, color: location.container?.color, selectedTargetId: item?.sectionId }) : ''}<p class="expiry-local-note">${isPhysicalLayoutValidated(diagram, location.container || chariot) ? 'Organisation visuelle validée' : 'Organisation visuelle à préciser'}</p>${stage === 0 ? action ? `<button type="button" class="primary-button" data-localize-expiry-action="${escapeHtml(action.id)}" data-advance-action="${escapeHtml(action.id)}">Emplacement confirmé · Continuer</button>` : `<button type="button" class="primary-button" data-plan-expiry="${escapeHtml(lot.id)}" data-start-expiry-treatment="${escapeHtml(lot.id)}">Localiser et commencer</button>` : ''}`;
  const presentQuantity = Number(lot.quantityPresent ?? lot.quantity) || '';
  const removeContent = `<form id="expiry-removal-form" class="p0-form"><input type="hidden" name="lotId" value="${escapeHtml(lot.id)}"><input type="hidden" name="actionId" value="${escapeHtml(action?.id || '')}"><input type="hidden" name="oldLotNumber" value="${escapeHtml(lot.lotNumber)}"><div class="expiry-old-lot"><span>Ancien lot</span><strong>${escapeHtml(lot.lotNumber)}</strong><small>${escapeHtml(formatDate(lot.expiryDate, { month: '2-digit', year: 'numeric' }))}</small></div><label class="p0-field"><span>Quantité retirée</span><input type="number" name="quantity" min="1" max="${presentQuantity}" step="1" inputmode="numeric" value="${escapeHtml(removal.quantity || '')}" required></label><label class="p0-field"><span>Motif</span><select name="reason" required><option value="">Sélectionner…</option><option value="expired">Périmé</option><option value="logistics-threshold">Échéance logistique atteinte</option><option value="packaging-damage">Emballage altéré</option><option value="other-observation">Autre constat</option></select></label><button type="submit" class="primary-button">Enregistrer le retrait</button></form>`;
  const replaceContent = `<form id="expiry-replacement-form" class="p0-form"><input type="hidden" name="lotId" value="${escapeHtml(lot.id)}"><input type="hidden" name="actionId" value="${escapeHtml(action?.id || '')}"><input type="hidden" name="itemId" value="${escapeHtml(lot.itemId)}"><label class="p0-field"><span>Nouveau numéro de lot</span><input name="lotNumber" value="${escapeHtml(replacement.lotNumber || '')}" required autocomplete="off" autocapitalize="characters"></label><label class="p0-field"><span>Nouvelle péremption</span><input type="month" name="expiryMonth" value="${escapeHtml(replacement.expiryMonth || '')}" required></label><label class="p0-field"><span>Quantité installée</span><input type="number" name="quantity" min="1" step="1" inputmode="numeric" value="${escapeHtml(replacement.quantity || '')}" required></label><button type="submit" class="primary-button">Enregistrer le remplacement</button></form>`;
  const validateContent = stage === 4 ? '<div class="success-banner">Action clôturée. L’ancien lot est archivé et le nouveau lot reste actif dans le stock vivant.</div>' : `<form id="expiry-validation-form" class="p0-form"><input type="hidden" name="lotId" value="${escapeHtml(lot.id)}"><input type="hidden" name="actionId" value="${escapeHtml(action?.id || '')}"><fieldset class="expiry-validation-list"><legend>Vérification finale</legend><label><input type="checkbox" name="removed" required> Ancien produit retiré</label><label><input type="checkbox" name="replaced" required> Nouveau produit replacé</label><label><input type="checkbox" name="quantityConform" required> Quantité conforme</label><label><input type="checkbox" name="dateRecorded" required> Nouvelle date enregistrée</label><label><input type="checkbox" name="containerAvailable" required> Contenant disponible</label></fieldset><button type="submit" class="primary-button">Valider et clôturer</button></form>`;
  return `${step(0, 'Localiser', 'Repérer le contenant et son organisation.', localizeContent)}${step(1, 'Retirer', 'Tracer le retrait de l’ancien lot.', removeContent)}${step(2, 'Remplacer', 'Enregistrer uniquement le nouveau lot réellement installé.', replaceContent)}${step(3, 'Valider', 'Contrôler la remise en place et clôturer.', validateContent)}`;
}

function renderExpiryDetail(state, lotId) {
  const { active, workflow, treated } = expiryModels(state);
  const lot = [...active, ...workflow, ...treated].find((candidate) => candidate.id === safeDecode(lotId));
  if (!lot) return `${header('Lot introuvable', 'Ce lot n’est pas présent dans le stock vivant.', 'Péremptions', 'expiry')}<div class="empty-state"><button type="button" class="primary-button" data-nav="expiry">Revenir aux péremptions</button></div>`;
  const item = lot.item || findReferenceItem(lot.itemId);
  const location = lotLocation(lot, item);
  return `${header(item?.label || 'Lot suivi', `${location.containerLabel} › ${location.sectionLabel}`, 'Traitement d’une péremption', 'expiry')}
    <article class="expiry-detail-hero ${lot.bucket === 'urgent' ? 'red' : lot.bucket === 'soon' ? 'orange' : lot.bucket === 'anticipate' ? 'violet' : lot.bucket === 'treated' ? 'green' : 'neutral'}"><span class="expiry-product-icon">${expiryPictogram(item)}</span><div><strong>Lot ${escapeHtml(lot.lotNumber)}</strong><span>${escapeHtml(formatDate(lot.expiryDate, { month: 'long', year: 'numeric' }))} · quantité ${Number(lot.quantityPresent ?? lot.quantity)}</span></div><strong>${escapeHtml(lot.bucket === 'treated' ? 'Traité' : daysLabel(lot.daysRemaining))}</strong></article>
    <div class="expiry-workflow">${renderExpiryWorkflow(state, lot)}</div>`;
}

function renderExpiry(state, ui, view, lotId) {
  if (view === 'add') return renderExpiryAdd(state, ui);
  if (view === 'lot') return renderExpiryDetail(state, lotId);
  return renderExpiryDashboard(state, ui);
}

function renderDefect(state, ui) {
  const selected = findContainer(ui.defectContainer) || SMUR_CONTAINERS[0];
  const items = selected.sections.flatMap((section) => section.items);
  return `${header('Signaler un défaut', 'Décrivez uniquement le constat. Aucune instruction clinique ou de réparation n’est fournie.', 'Anomalie fonctionnelle', 'actions')}
    <form id="defect-form" class="p0-form card card-pad">
      <label class="p0-field"><span>Contenant</span><select id="defect-container" name="containerId">${SMUR_CONTAINERS.map((container) => `<option value="${container.id}" ${container.id === selected.id ? 'selected' : ''}>${escapeHtml(container.label)}</option>`).join('')}</select></label>
      <label class="p0-field"><span>Élément (facultatif)</span><select name="itemId"><option value="">Tout le contenant</option>${items.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join('')}</select></label>
      <label class="p0-field"><span>Description factuelle</span><textarea name="note" rows="4" required placeholder="Décrire le défaut constaté lors du contrôle"></textarea></label>
      <label class="p0-checkbox"><input type="checkbox" name="blocking"><span><strong>Marquer comme bloquant</strong><small>Ce choix rendra le contenant indisponible jusqu’à résolution.</small></span></label>
      <button class="primary-button" type="submit">Créer l’anomalie et l’action</button>
    </form>`;
}

function renderMap(state, ui) {
  const openActions = state.actions.filter((action) => !['done', 'cancelled'].includes(action.status));
  const unlocatedActions = openActions.filter((action) => !findZone(actionZoneId(action)));
  const originId = ui.mapOrigin || 'pc-ide';
  const origin = findZone(originId) || SERVICE_ZONES[0];
  const zoom = Math.min(2.5, Math.max(1, Number(ui.mapZoom) || 1));
  const route = planRoute(openActions, origin.id);
  const points = [origin, ...route.map((step) => step.zone)].map((zone) => `${zone.x * 10},${zone.y * 6.058}`).join(' ');
  return `${header('Parcours terrain', 'Le trajet est recalculé à partir des actions ouvertes et du point de départ choisi.', 'Plan réel des Urgences', 'home')}
    <label class="p0-field p0-origin"><span>Point de départ sélectionné</span><select id="map-origin">${SERVICE_ZONES.map((zone) => `<option value="${zone.id}" ${zone.id === origin.id ? 'selected' : ''}>${escapeHtml(zone.label)}</option>`).join('')}</select></label>
    ${unlocatedActions.length ? `<div class="p0-reference-banner route-location-warning">${icon('alert', 18)}<div><strong>${unlocatedActions.length} action${unlocatedActions.length > 1 ? 's' : ''} sans emplacement opérationnel validé</strong><span>Source de prélèvement ou destination finale inconnue : aucun trajet fictif n’est proposé.</span></div></div>` : ''}
    <section class="guide-map-card"><div class="guide-map-wrap"><div class="guide-map-viewport"><div class="guide-map-stage" style="width:${zoom * 100}%">
      <img class="guide-map-image" src="assets/plan-urgences-falaise.png" alt="Plan des Urgences de Falaise">
      <svg class="guide-route-layer" viewBox="0 0 1000 605.8" preserveAspectRatio="none" aria-hidden="true"><polyline class="service-route" points="${points}" vector-effect="non-scaling-stroke" /></svg>
      <span class="guide-map-origin" style="left:${origin.x}%;top:${origin.y}%"><span class="guide-origin-pulse"></span><span class="guide-origin-dot"></span><span class="guide-origin-label">DÉPART CHOISI</span></span>
      <span class="guide-map-markers">${route.map((step, index) => `<span class="guide-map-marker ${step.zone.tone} ${index === 0 ? 'active' : 'upcoming'}" style="left:${step.zone.x}%;top:${step.zone.y}%"><span>${index + 1}</span></span>`).join('')}</span>
    </div></div></div><div class="guide-zoom-controls"><button data-map-zoom="out" aria-label="Dézoomer">−</button><button class="guide-zoom-reset" data-map-zoom="reset">${Math.round(zoom * 100)} %</button><button data-map-zoom="in" aria-label="Zoomer">+</button></div></section>
    <section class="section"><div class="section-head"><h2>${route.length} étape${route.length > 1 ? 's' : ''}</h2></div>${route.length ? route.map((step, index) => `<article class="p0-route-step"><span>${index + 1}</span><div><h3>${escapeHtml(step.zone.label)}${step.role === 'destination_finale' ? ' · destination finale' : ''}</h3><p>${escapeHtml(step.zone.detail)} · ${step.actions.length} action${step.actions.length > 1 ? 's' : ''}</p>${step.actions.map((action) => `<button data-nav="action/${action.id}">${escapeHtml(action.title)} ${icon('chevron', 14)}</button>`).join('')}</div></article>`).join('') : '<div class="empty-state"><h3>Aucun déplacement requis</h3><p>Le parcours apparaîtra dès qu’une action ouverte possède un emplacement.</p></div>'}</section>`;
}

function renderStats(state) {
  const stats = computeStatistics(state);
  const eventTypes = Object.entries(state.events.reduce((acc, event) => { acc[event.type] = (acc[event.type] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  return `${header('Analyse', 'Indicateurs calculés depuis le journal local, sans interprétation clinique.', 'Pilotage', 'profile')}
    <div class="metrics"><article class="metric-card"><strong>${stats.returns}</strong><span>retours</span></article><article class="metric-card orange"><strong>${stats.openActions}</strong><span>actions ouvertes</span></article><article class="metric-card green"><strong>${stats.restocksCompleted}</strong><span>réarmements</span></article><article class="metric-card"><strong>${stats.completedAudits}</strong><span>contrôles terminés</span></article></div>
    <section class="section"><div class="section-head"><h2>Familles distinctes</h2></div><div class="p0-kpi-grid"><article class="p0-kpi success"><strong>${stats.normalUsage}</strong><span>usages normaux</span></article><article class="p0-kpi warning"><strong>${stats.conformityAnomalies}</strong><span>anomalies conformité</span></article><article class="p0-kpi danger"><strong>${stats.failures}</strong><span>défaillances</span></article><article class="p0-kpi neutral"><strong>${stats.interruptions}</strong><span>interruptions</span></article></div></section>
    <section class="section"><div class="section-head"><h2>Types d’événements</h2></div><div class="card">${eventTypes.map(([type, count]) => `<div class="p0-list-row"><span><strong>${escapeHtml(type.replaceAll('_', ' '))}</strong></span><strong>${count}</strong></div>`).join('')}</div></section>
    <section class="section"><div class="p0-info">${icon('chart', 18)} Temps moyen de résolution : ${stats.averageResolutionMinutes === null ? 'pas encore calculable' : `${stats.averageResolutionMinutes} minutes`}.</div></section>`;
}

function renderHistory(state) {
  const events = state.events.slice(0, 100);
  return `${header('Historique', 'Journal local append-only des faits opérationnels. Les données patient ne font pas partie du modèle.', 'Traçabilité', 'profile')}
    <div class="p0-event-list">${events.map((event) => `<article class="p0-event-row"><span class="p0-event-icon">${icon(event.type.includes('DEFECT') ? 'activity' : event.type.includes('AUDIT') ? 'clipboard' : 'clock', 17)}</span><div><strong>${escapeHtml(event.type.replaceAll('_', ' '))}</strong><p>${escapeHtml(event.subject || 'Événement local')}</p><small>${escapeHtml(formatDate(event.at, { dateStyle: 'short', timeStyle: 'short' }))} · ${escapeHtml(event.userId)} · ${event.connectivity === 'offline' ? 'créé hors ligne' : 'local'}</small></div><span class="status-pill ${event.syncStatus === 'pending' ? 'plan' : 'ready'}">${event.syncStatus === 'pending' ? 'En attente' : 'Local'}</span></article>`).join('') || '<div class="empty-state"><h3>Aucun événement</h3></div>'}</div>`;
}

function renderProfile(state) {
  const imported = SOURCE_DOCUMENTS.filter((source) => String(source.fileName || '').toLowerCase().endsWith('.pdf')).length;
  const loadedChariots = state.chariotReference?.references?.length || 0;
  const loadedChariotLines = flattenChariotReference(state.chariotReference).length;
  return `${header('Profil et système', 'Paramètres locaux, traçabilité et état du référentiel.', 'Configuration')}
    <section class="card card-pad p0-profile-card"><div class="p0-avatar">${icon('user', 28)}</div><div><h2>${escapeHtml(state.user.displayName)}</h2><p>Profil de cet appareil · stockage local · ${state.users.filter((user) => user.active).length} utilisateur${state.users.filter((user) => user.active).length > 1 ? 's' : ''} actif${state.users.filter((user) => user.active).length > 1 ? 's' : ''}</p></div></section>
    <form id="role-form" class="p0-form card card-pad"><label class="p0-field"><span>Rôle local</span><select name="role"><option value="soignant" ${state.user.role === 'soignant' ? 'selected' : ''}>Soignant</option><option value="referent" ${state.user.role === 'referent' ? 'selected' : ''}>Référent matériel</option><option value="pharmacie" ${state.user.role === 'pharmacie' ? 'selected' : ''}>Pharmacie</option><option value="biomedical" ${state.user.role === 'biomedical' ? 'selected' : ''}>Biomédical</option><option value="administrateur" ${state.user.role === 'administrateur' ? 'selected' : ''}>Administrateur</option></select></label><button class="secondary-button" type="submit">Enregistrer le rôle local</button></form>
    <section class="section"><div class="section-head"><h2>État technique</h2></div><div class="card"><div class="p0-list-row"><span><strong>Stockage</strong><small>${state.persistent ? 'IndexedDB persistant' : 'Mémoire temporaire — IndexedDB indisponible'}</small></span>${statusPill(state.persistent ? 'pret' : 'indisponible', state.persistent ? 'Actif' : 'Dégradé')}</div><div class="p0-list-row"><span><strong>Synchronisation</strong><small>Aucun serveur configuré</small></span><strong>${state.sync.pending} en attente</strong></div><div class="p0-list-row"><span><strong>Version</strong><small>${APP_RELEASE.date}</small></span><strong>${APP_RELEASE.version}</strong></div></div></section>
    <section class="section"><div class="section-head"><h2>Référentiel et sources</h2></div><div class="card"><div class="p0-list-row"><span><strong>${imported} compositions PDF</strong><small>361 lignes structurées depuis les documents sources</small></span></div><div class="p0-list-row"><span><strong>${loadedChariots}/3 inventaires XLSX chargés</strong><small>${loadedChariots ? `${loadedChariotLines} lignes actives · URG.ENR.007 V4` : 'Données chariots indisponibles dans cette session'}</small></span></div></div></section>
    <details class="p0-details"><summary>Sources intégrées et exclusions</summary><div>${SOURCE_DOCUMENTS.map((source) => `<p><strong>${escapeHtml(source.documentRef || source.id)}</strong> · ${escapeHtml(source.fileName)}<br><small>${escapeHtml(source.status)}${source.revision ? ` · ${escapeHtml(source.revision)}` : ''}</small></p>`).join('')}<h3>Contenus volontairement exclus</h3>${EXCLUDED_SOURCE_CONTENT.map((entry) => `<p><strong>${escapeHtml(entry.label)}</strong><br><small>${escapeHtml(entry.reason)}</small></p>`).join('')}</div></details>
    <div class="p0-quick-grid"><button class="p0-quick" data-nav="history">${icon('clock')}<span><strong>Historique</strong><small>Événements et attente de synchronisation</small></span></button><button class="p0-quick" data-nav="stats">${icon('chart')}<span><strong>Analyse locale</strong><small>Indicateurs du journal</small></span></button><button class="p0-quick" data-nav="map">${icon('map')}<span><strong>Plan du service</strong><small>Parcours dynamique</small></span></button></div>`;
}

export function renderApp(state, ui, routeParts) {
  const viewState = operationalViewState(state);
  const [route = 'home', id, subId] = routeParts;
  let content;
  switch (route) {
    case 'return': content = renderReturn(viewState, ui); break;
    case 'inventory': content = renderInventory(viewState, ui); break;
    case 'container': content = renderContainerDetail(viewState, id, subId); break;
    case 'reserve': content = renderReserveDetail(viewState, id); break;
    case 'chariot': content = renderChariotDetail(viewState, id, subId); break;
    case 'actions': content = renderActions(viewState, ui); break;
    case 'action': content = renderActionDetail(viewState, id); break;
    case 'audits': content = renderAudits(viewState); break;
    case 'audit': content = renderAuditDetail(viewState, id); break;
    case 'expiry': content = renderExpiry(viewState, ui, id, subId); break;
    case 'defect': content = renderDefect(viewState, ui); break;
    case 'map': content = renderMap(viewState, ui); break;
    case 'stats': content = renderStats(viewState); break;
    case 'history': content = renderHistory(viewState); break;
    case 'profile': content = renderProfile(viewState); break;
    default: content = renderHome(viewState);
  }
  return `<div class="app-shell">${topbar(viewState, ui)}<main class="page">${content}</main>${bottomNav(route)}</div>`;
}
