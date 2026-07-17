import { escapeHtml, icon } from './utils.js';

function clampPercent(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function zoneStateMeta(status) {
  if (['pret', 'ready'].includes(status)) return { css: 'is-ready', label: 'Prêt', icon: 'check' };
  if (['validated', 'physical-layout-validated'].includes(status)) return { css: 'is-validated', label: 'Organisation visuelle validée', icon: 'check' };
  if (['indisponible', 'blocked', 'missing'].includes(status)) return { css: 'is-blocked', label: 'Indisponible', icon: 'alert' };
  if (['a_rearmer', 'warning', 'attention'].includes(status)) return { css: 'is-warning', label: 'À réarmer', icon: 'clock' };
  if (status === 'physical-layout-provisional') return { css: 'is-review', label: 'Organisation visuelle à préciser', icon: 'search' };
  if (status === 'source-ambiguity-to-validate') return { css: 'is-review', label: 'Libellé source à valider', icon: 'alert' };
  return { css: 'is-review', label: 'Emplacement physique à confirmer', icon: 'search' };
}

function diagramStateMeta(status) {
  if (['validated', 'physical-layout-validated'].includes(status)) return { css: 'is-validated', label: 'Organisation visuelle validée', icon: 'check' };
  return { css: 'is-review', label: 'Organisation visuelle à préciser', icon: 'search' };
}

function placeholderCopy(kind) {
  if (kind === 'reserve') return ['Organisation visuelle à préciser', 'Emplacements modifiables ultérieurement'];
  if (kind === 'chariot') return ['Organisation visuelle à préciser', 'Sections issues du document source'];
  return ['Organisation visuelle à préciser', 'Zones fonctionnelles modifiables'];
}

function zoneStyle(zone, options = {}) {
  const minimumWidth = Number(options.minimumZoneWidthPercent) || 15;
  const minimumHeight = Number(options.minimumZoneHeightPercent) || 18;
  const width = Math.min(100, Math.max(minimumWidth, Number(zone.width ?? zone.w) || minimumWidth));
  const height = Math.min(100, Math.max(minimumHeight, Number(zone.height ?? zone.h) || minimumHeight));
  const x = Math.min(clampPercent(zone.x), 100 - width);
  const y = Math.min(clampPercent(zone.y), 100 - height);
  return `left:${x}%;top:${y}%;width:${width}%;height:${height}%`;
}

function zoneMarkup(zone, options, index) {
  const selected = options.selectedTargetId && options.selectedTargetId === zone.targetId;
  const status = options.statusForZone?.(zone) || zone.status || 'a_verifier';
  const state = zoneStateMeta(status);
  const route = options.routeForZone?.(zone) || '';
  const action = options.actionForZone?.(zone) || null;
  const interactive = Boolean(route || action);
  const tag = interactive ? 'button' : 'span';
  const routeAttribute = route
    ? ` type="button" data-nav="${escapeHtml(route)}"`
    : action
      ? ` type="button" data-schema-action="${escapeHtml(action.type)}" data-schema-value="${escapeHtml(action.value)}"`
      : '';
  const selectionAttribute = action ? ` aria-pressed="${selected ? 'true' : 'false'}"` : route && selected ? ' aria-current="true"' : '';
  const itemCount = Number(zone.itemCount) > 0 ? `<small>${Number(zone.itemCount)} ligne${Number(zone.itemCount) > 1 ? 's' : ''}</small>` : '';
  return `<${tag}${routeAttribute}${selectionAttribute} class="visual-hotspot ${state.css} ${zone.physical === false ? 'is-nonphysical' : ''} ${selected ? 'is-selected' : ''}" style="${zoneStyle(zone, options)}" aria-label="${escapeHtml(zone.label)} — ${escapeHtml(state.label)}">
    <span class="visual-hotspot-index">${index + 1}</span>
    <span class="visual-hotspot-copy"><strong>${escapeHtml(zone.label)}</strong>${itemCount}<span class="visual-hotspot-state">${icon(state.icon, 10)}${escapeHtml(state.label)}</span></span>
  </${tag}>`;
}

export function renderVisualSchema(diagram, options = {}) {
  if (!diagram) return '<div class="visual-schema-empty">Schéma indisponible.</div>';
  const schemaKind = options.kind || diagram.kind || (diagram.viewKind?.startsWith('reserve') ? 'reserve' : diagram.viewKind?.startsWith('chariot') ? 'chariot' : 'container');
  const schemaLabel = options.label || diagram.label || '';
  const [placeholderTitle, placeholderSubtitle] = placeholderCopy(schemaKind);
  const zones = Array.isArray(diagram.zones) ? diagram.zones : [];
  const aspectRatio = String(diagram.aspectRatio || '4 / 3').replace(/[^0-9./ ]/g, '') || '4 / 3';
  const imageSource = typeof diagram.image === 'string' ? diagram.image : diagram.image?.src;
  const imageAlt = diagram.imageAlt || diagram.image?.alt || schemaLabel;
  const diagramState = diagramStateMeta(diagram.status);
  const schemaOptions = {
    ...options,
    minimumZoneWidthPercent: diagram.minimumZoneWidthPercent || 15,
    minimumZoneHeightPercent: diagram.minimumZoneHeightPercent || 18
  };
  const background = imageSource
    ? `<img class="visual-schema-image" src="${escapeHtml(imageSource)}" alt="${escapeHtml(imageAlt)}">`
    : `<div class="visual-schema-placeholder"><span>${icon(schemaKind === 'reserve' ? 'map' : 'bag', 28)}</span><strong>${placeholderTitle}</strong><small>${placeholderSubtitle}</small></div>`;

  return `<figure class="visual-schema" data-schema-kind="${escapeHtml(schemaKind)}">
    <div class="visual-schema-toolbar">
      <div><span class="visual-schema-kicker">${escapeHtml(diagram.viewKindLabel || diagram.viewKind || 'Vue schématique')}</span><strong>${escapeHtml(schemaLabel)}</strong></div>
      <span class="visual-schema-version">${escapeHtml(diagram.version || 'version non renseignée')}</span>
    </div>
    <div class="visual-schema-canvas" style="aspect-ratio:${aspectRatio}" data-color="${escapeHtml(options.color || diagram.color || 'neutre')}">
      ${background}
      <div class="visual-schema-zones" role="group" aria-label="Zones interactives — ${escapeHtml(schemaLabel)}">${zones.map((zone, index) => zoneMarkup(zone, schemaOptions, index)).join('')}</div>
    </div>
    <figcaption><span class="visual-schema-caption-state ${diagramState.css}">${icon(diagramState.icon, 15)} ${escapeHtml(diagram.statusLabel || diagramState.label)}</span><span>Les zones sont pilotées par le référentiel et pourront être repositionnées sans modifier cet écran.</span></figcaption>
  </figure>`;
}

export function renderSchemaThumbnail(diagram, options = {}) {
  const zones = Array.isArray(diagram?.zones) ? diagram.zones.slice(0, 8) : [];
  const kind = options.kind || diagram?.kind || (diagram?.viewKind?.startsWith('reserve') ? 'reserve' : diagram?.viewKind?.startsWith('chariot') ? 'chariot' : 'container');
  return `<span class="schema-thumbnail" data-schema-kind="${escapeHtml(kind)}" data-color="${escapeHtml(options.color || diagram?.color || 'neutre')}" aria-hidden="true">
    <span class="schema-thumbnail-shell">${zones.map((zone, index) => `<span class="schema-thumbnail-zone" style="${zoneStyle(zone, { minimumZoneWidthPercent: diagram?.minimumZoneWidthPercent, minimumZoneHeightPercent: diagram?.minimumZoneHeightPercent })}"><span>${index + 1}</span></span>`).join('')}</span>
    <span class="schema-thumbnail-badge">${Array.isArray(diagram?.zones) ? diagram.zones.length : 0} zone${diagram?.zones?.length > 1 ? 's' : ''}</span>
  </span>`;
}
