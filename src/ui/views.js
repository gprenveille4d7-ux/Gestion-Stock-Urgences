import { APP_RELEASE, EXPIRY_HORIZONS } from '../config.js';
import { OPERATIONAL_ASSETS } from '../data/operational-assets.js';
import { EXCLUDED_SOURCE_CONTENT, SOURCE_DOCUMENTS } from '../data/source-manifest.js';
import { findContainer, findReferenceItem, findZone, REFERENCE_ITEMS, SERVICE_ZONES, SMUR_CONTAINERS } from '../data/reference.js';
import { getChariotDiagram, getContainerDiagram, getReserveDiagram, RESERVE_ZONE_IDS } from '../data/visual-schemas.js';
import { deriveAvailability, summarizeAvailability } from '../domain/availability.js';
import { filterLotsByHorizon } from '../domain/expiry.js';
import { actionZoneId, planRoute } from '../domain/route-planner.js';
import { computeStatistics } from '../domain/statistics.js';
import { escapeHtml, formatDate, formatRelative, icon, normalizeSearch } from './utils.js';
import { renderSchemaThumbnail, renderVisualSchema } from './visual-schema.js';

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
  return `<button class="action-card" data-nav="action/${action.id}">
    <span class="action-accent ${action.priority === 'critique' ? 'red' : 'blue'}"></span>
    <span class="action-copy"><strong>${escapeHtml(action.title)}${action.source === 'demo-synthetic' ? ' · DÉMO' : ''}</strong><p>${escapeHtml(container?.label || 'Référentiel hérité')}</p><span class="action-meta"><span>${icon('clock', 14)} ${escapeHtml(stage)}</span><span>${escapeHtml(formatRelative(action.dueAt || action.createdAt))}</span></span></span>
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

function demoBanner() {
  return `<div class="p0-reference-banner">${icon('alert', 18)}<div><strong>Référentiel de démonstration</strong><span>Compositions importées, validation hospitalière requise avant usage réel.</span></div></div>`;
}

function renderHome(state) {
  const summary = summarizeAvailability(state, SMUR_CONTAINERS);
  const openActions = state.actions.filter((action) => !['done', 'cancelled'].includes(action.status));
  const priorityRank = { critique: 4, haute: 3, normale: 2, planifiee: 1 };
  const prioritized = [...openActions].sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0) || new Date(a.createdAt) - new Date(b.createdAt)).slice(0, 4);
  const nextLots = filterLotsByHorizon(state.lots, 90).slice(0, 3);
  const attentionContainers = SMUR_CONTAINERS.map((container) => ({ container, availability: deriveAvailability(container.id, state) })).filter((entry) => entry.availability.status !== 'pret');
  return `${header('Bonjour', 'Vue synthétique de la préparation opérationnelle locale.', 'Relève du jour')}
    <span class="release-stamp">Version ${APP_RELEASE.version} · ${APP_RELEASE.date}</span>
    ${demoBanner()}
    <section class="p0-kpi-grid" aria-label="Synthèse des disponibilités">
      <button class="p0-kpi success" data-nav="inventory"><strong>${summary.pret}</strong><span>prêts</span></button>
      <button class="p0-kpi warning" data-nav="actions"><strong>${summary.pret_avec_action_a_anticiper + summary.a_verifier + summary.a_rearmer}</strong><span>à traiter</span></button>
      <button class="p0-kpi danger" data-nav="actions"><strong>${summary.indisponible}</strong><span>indisponibles</span></button>
      <button class="p0-kpi neutral" data-nav="actions"><strong>${openActions.length}</strong><span>actions ouvertes</span></button>
    </section>
    <section class="p0-quick-grid">
      <button class="p0-quick primary" data-nav="return">${icon('plus')}<span><strong>Retour d'intervention</strong><small>Déclarer ce qui a été ouvert ou utilisé</small></span></button>
      <button class="p0-quick" data-nav="audits">${icon('clipboard')}<span><strong>Commencer un contrôle</strong><small>Enregistrement élément par élément</small></span></button>
      <button class="p0-quick" data-nav="expiry">${icon('calendar')}<span><strong>Péremptions</strong><small>Anticiper un remplacement</small></span></button>
      <button class="p0-quick" data-nav="map">${icon('map')}<span><strong>Parcours terrain</strong><small>Itinéraire construit depuis les actions</small></span></button>
    </section>
    <section class="section"><div class="section-head"><h2>Priorités opérationnelles</h2><button class="text-button" data-nav="actions">Tout voir</button></div><div class="action-list">${prioritized.length ? prioritized.map(actionCard).join('') : '<div class="empty-state"><h3>Aucune action ouverte</h3><p>Les contenants connus sont sans action active.</p></div>'}</div></section>
    ${attentionContainers.length ? `<section class="section"><div class="section-head"><h2>Disponibilité à expliquer</h2></div><div class="p0-status-list">${attentionContainers.slice(0, 5).map(({ container, availability }) => `<button data-nav="inventory" class="p0-status-row"><span class="p0-color-dot" data-color="${escapeHtml(container.color)}"></span><span><strong>${escapeHtml(container.label)}</strong><small>${escapeHtml(availability.reasons[0] || 'Action ouverte')}</small></span>${statusPill(availability.status, availability.label)}</button>`).join('')}</div></section>` : ''}
    <section class="section"><div class="section-head"><h2>Prochaines péremptions démo</h2><button class="text-button" data-nav="expiry">Gérer</button></div><div class="card">${nextLots.map((lot) => { const item = findReferenceItem(lot.itemId); return `<div class="p0-list-row"><span><strong>${escapeHtml(item?.label)}</strong><small>${escapeHtml(item?.containerLabel)} · lot de démonstration</small></span><strong class="p0-days ${lot.daysRemaining <= 30 ? 'danger' : ''}">${lot.daysRemaining} j</strong></div>`; }).join('') || '<div class="card-pad">Aucun lot dans cet horizon.</div>'}</div></section>`;
}

function renderReturn(state, ui) {
  const selectedContainer = findContainer(ui.usageContainer);
  const sections = selectedContainer?.sections || [];
  const selectedSection = sections.find((section) => section.id === ui.usageSection);
  const items = selectedSection?.items || [];
  const direct = ui.usageItem && ['utilise', 'manquant'].includes(ui.usageDeclaration);
  const diagram = selectedContainer ? getContainerDiagram(selectedContainer) : null;
  return `${header("Retour d'intervention", 'Ciblez le niveau physique le plus précis connu. Le sac parent est déduit automatiquement.', 'Déclaration rapide', 'home')}
    ${demoBanner()}
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
      <label class="p0-field"><span>Note factuelle (facultatif)</span><textarea name="note" rows="3" placeholder="Ex. sac ouvert, contenu à contrôler"></textarea></label>
      <div class="p0-info">${icon(direct ? 'plus' : 'clipboard', 18)} ${direct ? 'L’élément connu créera directement une action de réarmement, sans imposer un contrôle complet.' : 'Le contrôle sera limité au kit choisi, ou au contenant complet si aucun kit n’est sélectionné.'}</div>
      <button class="primary-button" type="submit">${direct ? 'Créer le réarmement ciblé' : 'Enregistrer la déclaration'}</button>
    </form>
    <section class="section"><div class="section-head"><h2>Flux appliqué</h2></div><ol class="p0-flow"><li><strong>Déclaration</strong><span>Événement horodaté</span></li><li><strong>Contrôle</strong><span>Observations atomiques</span></li><li><strong>Réarmement</strong><span>Actions ciblées</span></li><li><strong>Remise en place</strong><span>Clôture tracée</span></li></ol></section>`;
}

function flattenChariotReference(chariotReference) {
  if (!chariotReference?.references) return [];
  return chariotReference.references.flatMap((reference) => reference.containers.flatMap((container) => container.items.map((item) => ({
    ...item,
    id: `xlsx:${item.id}`,
    inventoryId: reference.id,
    sectionId: container.id,
    containerLabel: reference.label,
    sectionLabel: container.label,
    sourceStatus: reference.sourceStatus,
    sourceType: 'xlsx'
  }))));
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
  const diagram = getContainerDiagram(container);
  const source = SOURCE_DOCUMENTS.find((candidate) => candidate.id === container.sourceId);
  return `<article class="inventory-visual-card">
    <button type="button" class="inventory-visual-main" data-nav="container/${container.id}">
      ${renderSchemaThumbnail(diagram, { kind: 'container', color: container.color })}
      <span class="inventory-visual-copy"><span class="inventory-kind">${escapeHtml(container.kind)} · ${escapeHtml(source?.documentRef || 'source à vérifier')}</span><strong>${escapeHtml(container.label)}</strong><small>${itemCount} lignes · ${container.sections.length} zone${container.sections.length > 1 ? 's' : ''}</small></span>
      ${icon('chevron', 18)}
    </button>
    <div class="inventory-visual-footer">${statusPill(availability.status, availability.label)}<span>Schéma modifiable</span></div>
  </article>`;
}

function renderReserveInventoryCard(zone) {
  const diagram = getReserveDiagram(zone.id, SMUR_CONTAINERS, OPERATIONAL_ASSETS);
  return `<article class="inventory-visual-card reserve-card">
    <button type="button" class="inventory-visual-main" data-nav="reserve/${zone.id}">
      ${renderSchemaThumbnail(diagram, { kind: 'reserve' })}
      <span class="inventory-visual-copy"><span class="inventory-kind">Réserve · implantation à valider</span><strong>${escapeHtml(zone.label)}</strong><small>${diagram.zones.length} contenant${diagram.zones.length > 1 ? 's' : ''} ou équipement${diagram.zones.length > 1 ? 's' : ''} connu${diagram.zones.length > 1 ? 's' : ''}</small></span>
      ${icon('chevron', 18)}
    </button>
    <div class="inventory-visual-footer">${statusPill('a_verifier', 'À cartographier')}<span>Photo absente</span></div>
  </article>`;
}

function renderChariotInventoryCard(reference) {
  const diagram = getChariotDiagram(reference);
  const itemCount = reference.containers.reduce((sum, container) => sum + container.items.length, 0);
  return `<article class="inventory-visual-card historical-card">
    <button type="button" class="inventory-visual-main" data-nav="chariot/${reference.id}">
      ${renderSchemaThumbnail(diagram, { kind: 'chariot' })}
      <span class="inventory-visual-copy"><span class="inventory-kind">Chariot · source historique</span><strong>${escapeHtml(reference.label)}</strong><small>${itemCount} lignes · ${reference.containers.length} tiroirs ou plateaux</small></span>
      ${icon('chevron', 18)}
    </button>
    <div class="inventory-visual-footer">${statusPill('a_verifier', 'Historique')}<span>Activation interdite sans validation</span></div>
  </article>`;
}

function renderInventory(state, ui) {
  const query = normalizeSearch(ui.search);
  const chariotItems = flattenChariotReference(state.chariotReference);
  const all = [...REFERENCE_ITEMS.map((item) => ({ ...item, sourceType: 'pdf', sourceStatus: 'draft-to-validate' })), ...chariotItems];
  const results = query ? all.filter((item) => normalizeSearch(`${item.label} ${item.sourceText || ''} ${item.containerLabel} ${item.sectionLabel} ${item.productCode || ''}`).includes(query)).slice(0, 80) : [];
  const chariots = state.chariotReference?.references || [];
  const inventoryCount = SMUR_CONTAINERS.length + chariots.length;
  return `${header('Matériel', `${REFERENCE_ITEMS.length + chariotItems.length} lignes issues de ${inventoryCount} inventaires chargés, sans masquer leur niveau de validation.`, 'Inventaires visuels')}
    ${demoBanner()}
    <label class="p0-search">${icon('search', 19)}<span class="sr-only">Rechercher dans le référentiel</span><input id="reference-search" type="search" value="${escapeHtml(ui.search)}" placeholder="Produit, matériel, code ou emplacement…" autocomplete="off"></label>
    ${query ? `<section class="section"><div class="section-head"><h2>${results.length} résultat${results.length > 1 ? 's' : ''}${results.length === 80 ? ' affichés' : ''}</h2></div><div class="p0-search-results">${results.map((item) => {
      const container = item.sourceType === 'pdf' ? findContainer(item.containerId) : null;
      const zone = container ? findZone(container.stockZoneId) : null;
      const route = item.sourceType === 'pdf' ? `container/${item.containerId}/${sectionToken(item.sectionId)}` : `chariot/${item.inventoryId}/${item.sectionId}`;
      return `<article class="p0-search-result"><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.containerLabel)} › ${escapeHtml(item.sectionLabel)}</small><small>${Number(item.expectedQuantity)} attendu · ${item.sourceType === 'xlsx' ? 'source historique XLSX' : `affectation de zone à confirmer : ${zone?.label || 'non renseignée'}`}</small></div><button class="small-button" data-nav="${escapeHtml(route)}">Voir</button></article>`;
    }).join('') || '<div class="empty-state"><h3>Aucun résultat</h3><p>Essayez un libellé plus court.</p></div>'}</div></section>` : `
      <section class="inventory-overview" aria-label="Couverture des inventaires"><div><strong>${SMUR_CONTAINERS.length}</strong><span>contenants PDF</span></div><div><strong>${chariots.length}</strong><span>chariots XLSX chargés</span></div><div><strong>${RESERVE_ZONE_IDS.length}</strong><span>réserves</span></div></section>
      <section class="section"><div class="section-head"><div><p class="section-eyebrow">Localiser dans le service</p><h2>Réserves</h2></div><span class="section-count">3 vues</span></div><div class="inventory-visual-grid reserves">${RESERVE_ZONE_IDS.map((zoneId) => findZone(zoneId)).filter(Boolean).map(renderReserveInventoryCard).join('')}</div></section>
      <section class="section"><div class="section-head"><div><p class="section-eyebrow">Compositions PDF · 361 lignes</p><h2>Sacs et contenants SMUR</h2></div><span class="section-count">${SMUR_CONTAINERS.length} inventaires</span></div><div class="inventory-visual-grid">${SMUR_CONTAINERS.map((container) => renderContainerInventoryCard(state, container)).join('')}</div></section>
      <section class="section"><div class="section-head"><div><p class="section-eyebrow">Sources XLSX de mars 2024</p><h2>Chariots historiques</h2></div><span class="section-count">${chariotItems.length} lignes</span></div>${chariots.length ? `<div class="inventory-visual-grid">${chariots.map(renderChariotInventoryCard).join('')}</div>` : `<div class="p0-reference-banner historical-warning">${icon('alert', 18)}<div><strong>Référentiel chariots indisponible</strong><span>Les 3 fichiers restent référencés mais leurs 357 lignes n’ont pas pu être chargées. Réessayez en ligne ou vérifiez le cache PWA.</span></div></div>`}</section>`}`;
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
  const routeForZone = (zone) => `container/${container.id}/${sectionToken(zone.targetId)}`;
  const statusForZone = (zone) => openActionTouchesSection(state, container.id, zone.targetId) ? (availability.status === 'indisponible' ? 'indisponible' : 'a_rearmer') : container.validationRequired ? 'a_verifier' : 'pret';
  return `${header(container.label, `${itemCount} lignes d’inventaire · ${container.sections.length} zone${container.sections.length > 1 ? 's' : ''}.`, 'Schéma du contenant', 'inventory')}
    ${demoBanner()}
    <section class="inventory-detail-summary">
      <div><span class="p0-bag-color" data-color="${escapeHtml(container.color)}">${icon('bag')}</span><span><strong>${escapeHtml(container.shortLabel)}</strong><small>${escapeHtml(container.kind)} · affectation proposée : ${escapeHtml(stockZone?.label || 'non renseignée')} · à confirmer</small></span></div>
      ${statusPill(availability.status, availability.label)}
    </section>
    ${renderVisualSchema(diagram, { kind: 'container', label: container.label, color: container.color, selectedTargetId: selectedSection?.id || '', routeForZone, statusForZone })}
    <ol class="schema-zone-index" aria-label="Index des zones">${container.sections.map((section, index) => `<li class="${selectedSection?.id === section.id ? 'active' : ''}"><button type="button" data-nav="container/${container.id}/${sectionToken(section.id)}"><span>${index + 1}</span><span><strong>${escapeHtml(section.label)}</strong><small>${section.items.length} ligne${section.items.length > 1 ? 's' : ''}</small></span>${icon('chevron', 16)}</button></li>`).join('')}</ol>
    ${selectedSection ? `<section class="section inventory-section-detail"><div class="section-head"><div><p class="section-eyebrow">Zone ${container.sections.indexOf(selectedSection) + 1}</p><h2>${escapeHtml(selectedSection.label)}</h2></div><span class="section-count">${selectedSection.items.length} lignes</span></div><div class="inventory-line-list">${selectedSection.items.map((item) => `<div class="inventory-line"><span class="inventory-quantity">${Number(item.expectedQuantity)}×</span><span><strong>${escapeHtml(item.label)}</strong>${item.validationIssues.length ? `<span class="data-quality-badge">${icon('alert', 12)} À confirmer</span>` : ''}<small>${escapeHtml(item.category)} · unité : ${escapeHtml(item.unit)}${item.packSize ? ` · ${item.packSize} par paquet` : ''}${item.expiryTracked ? ' · péremption suivie' : ' · réutilisable'}</small>${item.validationIssues.map((issue) => `<small class="inventory-validation-issue">${escapeHtml(issue)}</small>`).join('')}${item.sourceText ? `<small class="inventory-source-text">Source : ${escapeHtml(item.sourceText)}</small>` : ''}</span></div>`).join('')}</div><div class="inventory-detail-actions"><button type="button" class="primary-button" data-return-container="${container.id}" data-return-section="${selectedSection.id}">${icon('plus', 18)} Déclarer cette zone ouverte ou utilisée</button><button type="button" class="secondary-button" data-start-audit="${container.id}" data-audit-section="${selectedSection.id}">${icon('clipboard', 18)} Contrôler cette zone</button></div></section>` : `<div class="schema-guidance">${icon('bag', 20)}<div><strong>Touchez une zone du schéma</strong><span>Vous n’afficherez alors que le kit ou compartiment concerné, sans parcourir une longue liste.</span></div></div>`}
    <details class="p0-details"><summary>Source, version et limites</summary><div><p><strong>${escapeHtml(source?.documentRef || source?.id || 'Source non renseignée')}</strong> · ${escapeHtml(source?.fileName || '')}<br><small>${escapeHtml(source?.revision || 'révision inconnue')} · ${escapeHtml(source?.sourceDate || 'date inconnue')} · composition à valider par l’établissement</small></p><p><strong>Schéma ${escapeHtml(diagram.version)}</strong><br><small>${diagram.layoutMode === 'semantic-override' ? 'Disposition déduite uniquement des intitulés de zones.' : diagram.layoutMode === 'inventory-placeholder' ? 'Aucune position interne n’est déduite : la zone ouvre seulement l’inventaire sourcé.' : 'Grille fonctionnelle générée, non représentative du rangement réel.'} Photo et coordonnées réelles à compléter.</small></p></div></details>`;
}

function renderReserveDetail(state, reserveId) {
  const zone = findZone(reserveId);
  if (!zone || !RESERVE_ZONE_IDS.includes(zone.id)) return `${header('Réserve introuvable', '', 'Erreur', 'inventory')}`;
  const diagram = getReserveDiagram(zone.id, SMUR_CONTAINERS, OPERATIONAL_ASSETS);
  const knownContainers = SMUR_CONTAINERS.filter((container) => container.stockZoneId === zone.id);
  const knownAssets = OPERATIONAL_ASSETS.filter((asset) => asset.homeZoneId === zone.id);
  return `${header(zone.label, 'Vue de repérage fondée uniquement sur les rattachements de zone connus.', 'Schéma de réserve', 'inventory')}
    <div class="p0-reference-banner reserve-warning">${icon('alert', 18)}<div><strong>Implantation physique non documentée</strong><span>Les armoires, étagères et bacs ne sont pas inventés. Ils restent à relever et valider sur place.</span></div></div>
    ${renderVisualSchema(diagram, {
      kind: 'reserve', label: zone.label,
      routeForZone: (schemaZone) => findContainer(schemaZone.targetId) ? `container/${schemaZone.targetId}` : ''
    })}
    <section class="physical-data-grid" aria-label="Données physiques à compléter"><div>${icon('map', 18)}<span><strong>Photo générale</strong><small>À ajouter</small></span></div><div>${icon('alert', 18)}<span><strong>Armoires</strong><small>À numéroter</small></span></div><div>${icon('alert', 18)}<span><strong>Étagères</strong><small>À relever</small></span></div><div>${icon('alert', 18)}<span><strong>Bacs</strong><small>À localiser</small></span></div></section>
    <section class="section"><div class="section-head"><h2>Matériel rattaché provisoirement à cette zone</h2><span class="section-count">${knownContainers.length + knownAssets.length}</span></div><div class="reserve-known-list">${knownContainers.map((container) => `<button type="button" data-nav="container/${container.id}"><span class="p0-color-dot" data-color="${escapeHtml(container.color)}"></span><span><strong>${escapeHtml(container.label)}</strong><small>${container.sections.reduce((sum, section) => sum + section.items.length, 0)} lignes · rattachement et position à confirmer</small></span>${icon('chevron', 17)}</button>`).join('')}${knownAssets.map((asset) => `<div><span class="asset-symbol">${icon('activity', 18)}</span><span><strong>${escapeHtml(asset.label)}</strong><small>Équipement de démonstration · position à confirmer</small></span>${statusPill('a_verifier', 'Démo')}</div>`).join('') || ''}</div></section>
    <div class="schema-guidance">${icon('alert', 20)}<div><strong>Stock de réarmement non cartographié</strong><span>La réserve, l’armoire, l’étagère et le bac de chaque produit devront être ajoutés après validation humaine.</span></div></div>`;
}

function renderChariotDetail(state, referenceId, sectionId) {
  const reference = state.chariotReference?.references?.find((candidate) => candidate.id === referenceId);
  if (!reference) return `${header('Chariot introuvable', '', 'Erreur', 'inventory')}`;
  const diagram = getChariotDiagram(reference);
  const selectedSection = findChariotSection(reference, sectionId);
  const itemCount = reference.containers.reduce((sum, container) => sum + container.items.length, 0);
  return `${header(reference.label, `${itemCount} lignes importées · ${reference.containers.length} tiroirs ou plateaux.`, 'Inventaire historique', 'inventory')}
    <div class="p0-reference-banner historical-warning">${icon('alert', 18)}<div><strong>Source historique uniquement</strong><span>Ce classeur de mars 2024 est consultable mais ne peut pas piloter un contrôle opérationnel avant validation.</span></div></div>
    ${renderVisualSchema(diagram, { kind: 'chariot', label: reference.label, selectedTargetId: selectedSection?.id || '', routeForZone: (zone) => `chariot/${reference.id}/${zone.targetId}` })}
    <ol class="schema-zone-index chariot-index">${reference.containers.map((container, index) => `<li class="${selectedSection?.id === container.id ? 'active' : ''}"><button type="button" data-nav="chariot/${reference.id}/${container.id}"><span>${index + 1}</span><span><strong>${escapeHtml(container.label)}</strong><small>${container.items.length} lignes</small></span>${icon('chevron', 16)}</button></li>`).join('')}</ol>
    ${selectedSection ? `<section class="section inventory-section-detail"><div class="section-head"><h2>${escapeHtml(selectedSection.label)}</h2><span class="section-count">${selectedSection.items.length} lignes</span></div><div class="inventory-line-list historical">${selectedSection.items.map((item) => `<div class="inventory-line"><span class="inventory-quantity">${Number(item.expectedQuantity)}×</span><span><strong>${escapeHtml(item.label)}</strong><small>${item.productCode ? `Code ${escapeHtml(item.productCode)} · ` : ''}cellule source ${escapeHtml(item.sourceCell || 'inconnue')}</small></span></div>`).join('')}</div></section>` : `<div class="schema-guidance">${icon('clipboard', 20)}<div><strong>Sélectionnez un tiroir ou un plateau</strong><span>L’inventaire correspondant s’affichera sans confondre cette source historique avec le référentiel actif.</span></div></div>`}`;
}

function renderActions(state, ui) {
  const filter = ui.actionFilter || 'open';
  const actions = state.actions.filter((action) => filter === 'all' || (filter === 'done' ? action.status === 'done' : !['done', 'cancelled'].includes(action.status)));
  return `${header('Actions', 'File locale issue des déclarations, contrôles, défauts et péremptions.', 'File opérationnelle')}
    ${actions.some((action) => action.source === 'demo-synthetic') ? demoBanner() : ''}
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
  return `${header(action.title, container?.label || 'Action importée', action.source === 'demo-synthetic' ? 'Action de démonstration' : 'Action opérationnelle', 'actions')}
    ${action.source === 'demo-synthetic' ? demoBanner() : ''}
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
    <details class="p0-details p0-assignment"><summary>Attribution · ${escapeHtml(state.users.find((user) => user.id === audit.userId)?.displayName || audit.userId)}</summary><form id="audit-assignment-form" class="p0-form"><input type="hidden" name="auditId" value="${audit.id}"><label class="p0-field"><span>Transmettre à</span><select name="userId">${state.users.filter((user) => user.active).map((user) => `<option value="${user.id}" ${user.id === audit.userId ? 'selected' : ''}>${escapeHtml(user.displayName)} · ${escapeHtml(user.role)}</option>`).join('')}</select></label><label class="p0-field"><span>Motif factuel (facultatif)</span><input name="reason" placeholder="Ex. remplacement pendant absence"></label><button class="secondary-button" type="submit">Enregistrer la passation</button></form></details>
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

function renderExpiry(state, ui) {
  const horizon = Number(ui.expiryHorizon || 90);
  const lots = filterLotsByHorizon(state.lots, horizon);
  return `${header('Péremptions', 'Lots synthétiques de démonstration. Les dates historiques des fichiers source ne sont jamais reprises.', 'Anticipation')}
    ${demoBanner()}
    <div class="p0-tabs">${EXPIRY_HORIZONS.map((days) => `<button data-expiry-horizon="${days}" class="${horizon === days ? 'active' : ''}">${days} j</button>`).join('')}</div>
    <div class="card">${lots.map((lot) => { const item = findReferenceItem(lot.itemId); const planned = state.actions.some((action) => action.lotId === lot.id && !['cancelled'].includes(action.status)); return `<article class="p0-expiry-row"><span class="expiry-accent ${lot.daysRemaining <= 30 ? 'red' : ''}"></span><div><strong>${escapeHtml(item?.label)}</strong><small>${escapeHtml(item?.containerLabel)} › ${escapeHtml(item?.sectionLabel)}</small><small>Lot ${escapeHtml(lot.lotNumber)} · échéance ${escapeHtml(formatDate(lot.expiryDate))}</small></div><span class="p0-days ${lot.daysRemaining <= 30 ? 'danger' : ''}">${lot.daysRemaining} j</span><button class="small-button" data-plan-expiry="${lot.id}" ${planned ? 'disabled' : ''}>${planned ? 'Planifié' : 'Planifier'}</button></article>`; }).join('') || '<div class="card-pad">Aucun lot actif dans cet horizon.</div>'}</div>`;
}

function renderDefect(state, ui) {
  const selected = findContainer(ui.defectContainer) || SMUR_CONTAINERS[0];
  const items = selected.sections.flatMap((section) => section.items);
  return `${header('Signaler un défaut', 'Décrivez uniquement le constat. Aucune instruction clinique ou de réparation n’est fournie.', 'Anomalie fonctionnelle', 'actions')}
    <form id="defect-form" class="p0-form card card-pad">
      <label class="p0-field"><span>Contenant</span><select id="defect-container" name="containerId">${SMUR_CONTAINERS.map((container) => `<option value="${container.id}" ${container.id === selected.id ? 'selected' : ''}>${escapeHtml(container.label)}</option>`).join('')}</select></label>
      <label class="p0-field"><span>Élément (facultatif)</span><select name="itemId"><option value="">Tout le contenant</option>${items.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join('')}</select></label>
      <label class="p0-field"><span>Description factuelle</span><textarea name="note" rows="4" required placeholder="Ex. ne s’allume pas lors du contrôle local"></textarea></label>
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
    <div class="p0-event-list">${events.map((event) => `<article class="p0-event-row"><span class="p0-event-icon">${icon(event.type.includes('DEFECT') ? 'activity' : event.type.includes('AUDIT') ? 'clipboard' : 'clock', 17)}</span><div><strong>${escapeHtml(event.type.replaceAll('_', ' '))}</strong><p>${escapeHtml(event.subject || 'Événement local')}</p><small>${escapeHtml(formatDate(event.at, { dateStyle: 'short', timeStyle: 'short' }))} · ${escapeHtml(event.userId)} · ${event.connectivity === 'offline' ? 'créé hors ligne' : 'local'}</small></div><span class="status-pill ${event.syncStatus === 'pending' || event.source === 'demo-synthetic' ? 'plan' : 'ready'}">${event.source === 'demo-synthetic' ? 'Démo' : event.syncStatus === 'pending' ? 'En attente' : 'Local'}</span></article>`).join('') || '<div class="empty-state"><h3>Aucun événement</h3></div>'}</div>`;
}

function renderProfile(state) {
  const imported = SOURCE_DOCUMENTS.filter((source) => source.status === 'draft-to-validate').length;
  const loadedChariots = state.chariotReference?.references?.length || 0;
  const loadedChariotLines = flattenChariotReference(state.chariotReference).length;
  return `${header('Profil et système', 'Paramètres locaux, traçabilité et état du référentiel.', 'Configuration')}
    <section class="card card-pad p0-profile-card"><div class="p0-avatar">${icon('user', 28)}</div><div><h2>${escapeHtml(state.user.displayName)}</h2><p>Mode local de démonstration · aucune authentification serveur · ${state.users.filter((user) => user.active).length} profils démo</p></div></section>
    <form id="role-form" class="p0-form card card-pad"><label class="p0-field"><span>Rôle simulé pour préparer les droits futurs</span><select name="role"><option value="soignant" ${state.user.role === 'soignant' ? 'selected' : ''}>Soignant</option><option value="referent" ${state.user.role === 'referent' ? 'selected' : ''}>Référent matériel</option><option value="pharmacie" ${state.user.role === 'pharmacie' ? 'selected' : ''}>Pharmacie</option><option value="biomedical" ${state.user.role === 'biomedical' ? 'selected' : ''}>Biomédical</option><option value="administrateur" ${state.user.role === 'administrateur' ? 'selected' : ''}>Administrateur</option></select></label><button class="secondary-button" type="submit">Enregistrer le rôle local</button></form>
    <section class="section"><div class="section-head"><h2>État technique</h2></div><div class="card"><div class="p0-list-row"><span><strong>Stockage</strong><small>${state.persistent ? 'IndexedDB persistant' : 'Mémoire temporaire — IndexedDB indisponible'}</small></span>${statusPill(state.persistent ? 'pret' : 'indisponible', state.persistent ? 'Actif' : 'Dégradé')}</div><div class="p0-list-row"><span><strong>Synchronisation</strong><small>Aucun serveur configuré</small></span><strong>${state.sync.pending} en attente</strong></div><div class="p0-list-row"><span><strong>Version</strong><small>${APP_RELEASE.date}</small></span><strong>${APP_RELEASE.version}</strong></div></div></section>
    <section class="section"><div class="section-head"><h2>Référentiel et sources</h2></div>${demoBanner()}<div class="card"><div class="p0-list-row"><span><strong>${imported} compositions PDF</strong><small>361 lignes structurées</small></span></div><div class="p0-list-row"><span><strong>${loadedChariots}/3 classeurs historiques chargés</strong><small>${loadedChariots ? `${loadedChariotLines} lignes sans péremptions ni signatures` : 'Données chariots indisponibles dans cette session'}</small></span></div></div></section>
    <details class="p0-details"><summary>Sources intégrées et exclusions</summary><div>${SOURCE_DOCUMENTS.map((source) => `<p><strong>${escapeHtml(source.documentRef || source.id)}</strong> · ${escapeHtml(source.fileName)}<br><small>${escapeHtml(source.status)}${source.revision ? ` · ${escapeHtml(source.revision)}` : ''}</small></p>`).join('')}<h3>Contenus volontairement exclus</h3>${EXCLUDED_SOURCE_CONTENT.map((entry) => `<p><strong>${escapeHtml(entry.label)}</strong><br><small>${escapeHtml(entry.reason)}</small></p>`).join('')}</div></details>
    <div class="p0-quick-grid"><button class="p0-quick" data-nav="history">${icon('clock')}<span><strong>Historique</strong><small>Événements et attente de synchronisation</small></span></button><button class="p0-quick" data-nav="stats">${icon('chart')}<span><strong>Analyse locale</strong><small>Indicateurs du journal</small></span></button><button class="p0-quick" data-nav="map">${icon('map')}<span><strong>Plan du service</strong><small>Parcours dynamique</small></span></button></div>`;
}

export function renderApp(state, ui, routeParts) {
  const [route = 'home', id, subId] = routeParts;
  let content;
  switch (route) {
    case 'return': content = renderReturn(state, ui); break;
    case 'inventory': content = renderInventory(state, ui); break;
    case 'container': content = renderContainerDetail(state, id, subId); break;
    case 'reserve': content = renderReserveDetail(state, id); break;
    case 'chariot': content = renderChariotDetail(state, id, subId); break;
    case 'actions': content = renderActions(state, ui); break;
    case 'action': content = renderActionDetail(state, id); break;
    case 'audits': content = renderAudits(state); break;
    case 'audit': content = renderAuditDetail(state, id); break;
    case 'expiry': content = renderExpiry(state, ui); break;
    case 'defect': content = renderDefect(state, ui); break;
    case 'map': content = renderMap(state, ui); break;
    case 'stats': content = renderStats(state); break;
    case 'history': content = renderHistory(state); break;
    case 'profile': content = renderProfile(state); break;
    default: content = renderHome(state);
  }
  return `<div class="app-shell">${topbar(state, ui)}<main class="page">${content}</main>${bottomNav(route)}</div>`;
}
