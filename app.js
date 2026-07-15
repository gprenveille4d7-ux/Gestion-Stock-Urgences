const STORAGE_KEY = "releve-smur-operational-v1";
const SCHEMA_VERSION = 1;

const REFERENCE = Object.freeze({
  id: "ref-smur-2026-07-v3",
  version: "3.2",
  activatedAt: "2026-07-01T06:00:00.000Z",
  containers: [
    {
      id: "pedia",
      name: "Sac vert PÉDIA",
      shortName: "PÉDIA",
      color: "green",
      children: [
        { id: "pedia-removable", name: "Sac amovible vert", children: [] },
        {
          id: "pedia-red",
          name: "Sac rouge",
          children: [
            { id: "kit-perfusion", name: "Kit perfusion", children: [] },
            { id: "kit-airway", name: "Kit voies aériennes", children: [] },
            { id: "kit-medication", name: "Kit médicaments", children: [] }
          ]
        }
      ]
    },
    {
      id: "respi",
      name: "Sac bleu RESPI",
      shortName: "RESPI",
      color: "blue",
      children: [
        { id: "respi-removable", name: "Sac amovible bleu", children: [] },
        { id: "respi-intubation", name: "Pochette intubation", children: [] },
        { id: "respi-right", name: "Face latérale droite", children: [] },
        { id: "respi-left", name: "Face latérale gauche", children: [] },
        { id: "respi-main", name: "Compartiment principal", children: [] }
      ]
    },
    {
      id: "maternity",
      name: "Sac noir MATER",
      shortName: "MATER",
      color: "black",
      children: [
        { id: "mater-delivery", name: "Kit accouchement", children: [] },
        { id: "mater-newborn", name: "Kit nouveau-né", children: [] }
      ]
    }
  ],
  kitItems: [
    { id: "garrot-small", name: "Garrot petit", family: "Équipement", expected: 1, demoPresent: 1 },
    { id: "garrot-large", name: "Garrot grand", family: "Équipement", expected: 1, demoPresent: 1 },
    { id: "compresses", name: "Compresses stériles", family: "Consommable", expected: 2, demoPresent: 2 },
    { id: "biseptine", name: "Biseptine", family: "Consommable", expected: 2, demoPresent: 1 },
    { id: "tegaderm", name: "Tegaderm petit", family: "Consommable", expected: 1, demoPresent: 1 },
    { id: "nacl", name: "NaCl 0,9% 10 mL", family: "Consommable", expected: 1, demoPresent: 1 },
    { id: "perfuseur", name: "Perfuseur", family: "Consommable", expected: 1, demoPresent: 1 },
    { id: "kt22", name: "KT 22G", family: "Consommable", expected: 2, demoPresent: 1 }
  ],
  auditZones: [
    {
      id: "zone-removable",
      name: "Sac amovible bleu",
      items: [
        { id: "oxygen-mask", name: "Masque O₂ adulte" },
        { id: "oxygen-tubing", name: "Tubulure O₂" },
        { id: "nebulizer", name: "Nébuliseur" }
      ]
    },
    {
      id: "zone-intubation",
      name: "Pochette intubation",
      items: [
        { id: "blade-3", name: "Lame laryngoscope n°3" },
        { id: "blade-4", name: "Lame laryngoscope n°4" },
        { id: "tube-65", name: "Sonde 6,5" },
        { id: "tube-70", name: "Sonde 7,0" },
        { id: "tube-75", name: "Sonde 7,5" }
      ]
    },
    { id: "zone-right", name: "Face latérale droite", items: [{ id: "filter", name: "Filtre antibactérien" }] },
    { id: "zone-left", name: "Face latérale gauche", items: [{ id: "capno", name: "Ligne de capnographie" }] },
    { id: "zone-main", name: "Compartiment principal", items: [{ id: "ambu", name: "BAVU adulte" }] }
  ]
});

const MATERIALS = [
  { id: "pedia", name: "Sac vert PÉDIA", detail: "Kit perfusion", icon: "bag" },
  { id: "respi", name: "Sac bleu RESPI", detail: "Contrôle bimestriel en cours", icon: "bag" },
  { id: "fibrinolysis", name: "Sac jaune FIBRINOLYSE", detail: "Actilyse à remplacer dans 28 jours", icon: "bag" },
  { id: "io-drill", name: "Perceuse intra-osseuse", detail: "Défaut fonctionnel déclaré", icon: "activity" }
];

const EXPIRIES = [
  { id: "actilyse", name: "Actilyse 50 mg", place: "Sac jaune FIBRINOLYSE", lot: "240315", days: 28 },
  { id: "celocurine", name: "Célocurine 100 mg", place: "Frigo médicaments", lot: "231120", days: 42 },
  { id: "rapid-rhino", name: "Rapid Rhino", place: "Sac plaies · Sutures · Épistaxis", lot: "RR2311", days: 73 },
  { id: "adrenaline", name: "Adrénaline 1 mg", place: "Frigo médicaments", lot: "240101", days: 105 }
];

const ICONS = {
  cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  bag: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M9 12h6M12 9v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8 10h8M8 14h8M8 18h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  arrowLeft: '<path d="m15 18-6-6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4M12 17h.01"/>',
  chart: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  trend: '<path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 9M5.5 15A7 7 0 0 0 18 17.5l2-2.5"/>',
  wifi: '<path d="M5 9a11 11 0 0 1 14 0M8 13a6 6 0 0 1 8 0M11 17a2 2 0 0 1 2 0M12 20h.01"/>',
  shield: '<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  activity: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  package: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  hand: '<path d="M7 12V6a2 2 0 0 1 4 0v5M11 11V4a2 2 0 0 1 4 0v7M15 11V6a2 2 0 0 1 4 0v8c0 5-3 7-7 7h-1c-3 0-5-2-7-5l-2-3a2 2 0 0 1 3-2l2 1Z"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
};

function icon(name, size = 22, filled = false) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.more}</svg>`;
}

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createInitialState() {
  const completedIds = ["oxygen-mask", "oxygen-tubing", "nebulizer", "blade-3", "blade-4", "tube-65", "tube-70"];
  return {
    schemaVersion: SCHEMA_VERSION,
    user: { id: "user-guillaume", name: "Guillaume", role: "IDE" },
    actions: [
      {
        id: "action-io-demo",
        type: "REPAIR_EQUIPMENT",
        status: "open",
        severity: "blocking",
        containerId: "io-drill",
        title: "Tester la perceuse intra-osseuse",
        detail: "Défaut fonctionnel déclaré",
        createdAt: "2026-07-14T10:26:00.000Z",
        sourceEventId: "event-io-demo"
      },
      {
        id: "action-expiry-demo",
        type: "REPLACE_EXPIRY",
        status: "open",
        severity: "planned",
        containerId: "fibrinolysis",
        title: "Remplacer Actilyse 50 mg",
        detail: "Péremption dans 28 jours · aucune indisponibilité actuelle",
        createdAt: "2026-07-13T07:15:00.000Z",
        sourceEventId: "event-expiry-demo"
      }
    ],
    events: [
      { id: "event-io-demo", type: "FAILURE_REPORTED", family: "failure", subject: "Perceuse intra-osseuse", at: "2026-07-14T10:26:00.000Z", user: "Marie L." },
      { id: "event-expiry-demo", type: "EXPIRY_DETECTED", family: "compliance", subject: "Actilyse 50 mg", at: "2026-07-13T07:15:00.000Z", user: "Système" },
      { id: "event-audit-start", type: "AUDIT_STARTED", family: "compliance", subject: "Sac bleu RESPI", at: "2026-07-12T06:30:00.000Z", user: "Marie L." }
    ],
    returnDraft: { expandedContainerId: null, expandedChildId: null, selectedNodeIds: [] },
    kitCheck: {
      referenceVersion: REFERENCE.version,
      actionId: null,
      observations: Object.fromEntries(REFERENCE.kitItems.map((item) => [item.id, { present: item.demoPresent, verified: false, updatedAt: null }]))
    },
    restock: null,
    audit: {
      id: "audit-jul-aug-2026",
      name: "Contrôle JUILLET / AOÛT",
      status: "in_progress",
      containerId: "respi",
      referenceId: REFERENCE.id,
      referenceVersion: REFERENCE.version,
      responsible: "Marie L.",
      startedAt: "2026-07-12T06:30:00.000Z",
      updatedAt: "2026-07-15T17:42:00.000Z",
      completedItemIds: completedIds,
      observations: Object.fromEntries(completedIds.map((id) => [id, { result: "compliant", at: "2026-07-15T17:42:00.000Z" }]))
    },
    analytics: {
      restockings: 47,
      openings: 12,
      anomalies: 8,
      expiries: 4,
      averageResolution: "3 h 42"
    },
    lastSavedAt: nowIso()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA_VERSION) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

let state = loadState();
let searchQuery = "";
let expiryFilter = "all";
let toastTimer;

function saveState({ notify = false, message = "Enregistré sur cet appareil" } = {}) {
  state.lastSavedAt = nowIso();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (notify) showToast(message, "saved");
}

function showToast(message, kind = "") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  clearTimeout(toastTimer);
  root.innerHTML = `<div class="toast ${kind}">${icon(kind === "saved" ? "check" : "alert", 18)}<span>${message}</span></div>`;
  toastTimer = setTimeout(() => { root.innerHTML = ""; }, 2400);
}

function formatTime(iso) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function openActions() {
  return state.actions.filter((action) => action.status === "open");
}

function actionFor(type, containerId) {
  return state.actions.find((action) => action.status === "open" && action.type === type && action.containerId === containerId);
}

function availabilityFor(materialId) {
  const related = openActions().filter((action) => action.containerId === materialId || (materialId === "pedia" && action.containerId === "kit-perfusion"));
  if (related.some((action) => action.severity === "blocking")) return { level: "blocked", label: "Indisponible", cause: related.find((action) => action.severity === "blocking").detail };
  if (related.some((action) => action.type === "RESTOCK_KIT")) return { level: "review", label: "À réarmer", cause: "Éléments manquants confirmés" };
  if (related.some((action) => action.type === "VERIFY_KIT")) return { level: "review", label: "À vérifier", cause: "Kit perfusion ouvert" };
  if (related.some((action) => action.severity === "planned")) return { level: "plan", label: "Prêt", cause: "1 action à prévoir · 28 j" };
  if (materialId === "respi" && state.audit.status === "in_progress") return { level: "ready", label: "Prêt", cause: `Contrôle en cours · ${auditProgress().percent} %` };
  return { level: "ready", label: "Prêt", cause: "Aucune action bloquante" };
}

function allAuditItems() {
  return REFERENCE.auditZones.flatMap((zone) => zone.items.map((item) => ({ ...item, zoneId: zone.id, zoneName: zone.name })));
}

function auditProgress() {
  const items = allAuditItems();
  const complete = state.audit.completedItemIds.length;
  return { complete, total: items.length, percent: Math.round((complete / items.length) * 100) };
}

function currentAuditItem() {
  return allAuditItems().find((item) => !state.audit.completedItemIds.includes(item.id)) || null;
}

function activeZone() {
  const item = currentAuditItem();
  return item ? REFERENCE.auditZones.find((zone) => zone.id === item.zoneId) : null;
}

function zoneProgress(zone) {
  const complete = zone.items.filter((item) => state.audit.completedItemIds.includes(item.id)).length;
  return { complete, total: zone.items.length, done: complete === zone.items.length };
}

function routeParts() {
  return (location.hash.replace(/^#\/?/, "") || "home").split("/");
}

function navigate(route) {
  const next = `#/${route}`;
  if (location.hash === next) render();
  else location.hash = next;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function topbar({ flowTitle = null, back = null } = {}) {
  if (flowTitle) {
    return `<header class="topbar">
      <div class="brand">
        <button class="back-button" data-action="navigate" data-route="${back || "home"}" aria-label="Retour">${icon("arrowLeft")}</button>
        <div class="brand-copy"><strong>${flowTitle}</strong><small>SMUR / Urgences</small></div>
      </div>
      <div class="local-state">Sauvegarde locale</div>
    </header>`;
  }
  return `<header class="topbar">
    <div class="brand">
      <div class="brand-mark">${icon("cross", 22, true)}</div>
      <div class="brand-copy"><strong>Relève</strong><small>SMUR / Urgences</small></div>
    </div>
    <div class="topbar-actions">
      <div class="local-state">Prêt hors ligne</div>
      <button class="icon-button" data-action="navigate" data-route="analysis" aria-label="Ouvrir l'analyse">${icon("chart")}</button>
    </div>
  </header>`;
}

function bottomNav(active) {
  const count = openActions().length;
  const items = [
    ["home", "Accueil", "home"],
    ["materials", "Matériel", "bag"],
    ["search", "Recherche", "search"],
    ["actions", "Actions", "clipboard"],
    ["profile", "Profil", "user"]
  ];
  return `<nav class="bottom-nav" aria-label="Navigation principale">
    ${items.map(([route, label, iconName], index) => `<button class="nav-item ${index === 2 ? "center" : ""} ${active === route ? "active" : ""}" data-action="navigate" data-route="${route}" aria-label="${label}">
      <span class="nav-icon">${icon(iconName, index === 2 ? 23 : 21)}</span>
      <span>${label}</span>
      ${route === "actions" && count ? `<span class="nav-badge">${count}</span>` : ""}
    </button>`).join("")}
  </nav>`;
}

function mainShell(content, active) {
  return `<div class="app-shell">${topbar()}<main class="page">${content}</main>${bottomNav(active)}</div>`;
}

function flowShell(content, title, back = "home") {
  return `<div class="app-shell">${topbar({ flowTitle: title, back })}<main class="page no-nav">${content}</main></div>`;
}

function materialIconClass(materialId) {
  if (materialId === "fibrinolysis") return "orange";
  if (materialId === "io-drill") return "red";
  return "";
}

function homeView() {
  const progress = auditProgress();
  const current = currentAuditItem();
  const actions = openActions();
  const attentionMaterials = MATERIALS.filter((material) => {
    const availability = availabilityFor(material.id);
    return availability.level !== "ready" || material.id === "respi";
  });
  return mainShell(`
    <section class="welcome">
      <p class="eyebrow">Centre opérationnel</p>
      <h1>Bonjour Guillaume.</h1>
      <p>Voici ce qui nécessite votre attention maintenant.</p>
    </section>

    ${state.audit.status === "in_progress" && current ? `<button class="resume-card" data-action="navigate" data-route="control/item">
      <span class="resume-icon">${icon("refresh")}</span>
      <span class="resume-copy">
        <small>Reprendre exactement où vous étiez</small>
        <strong>${escapeHtml(state.audit.name)} · ${progress.percent} %</strong>
        <small>${escapeHtml(current.zoneName)} → ${escapeHtml(current.name)}</small>
      </span>
      <span class="resume-progress">${progress.percent}%</span>
    </button>` : ""}

    <section class="section">
      <div class="section-head"><h2>Actions prioritaires</h2></div>
      <div class="priority-grid">
        <button class="priority-card" data-action="navigate" data-route="return">
          <span class="priority-icon">${icon("bag")}</span>
          <strong>Retour SMUR</strong>
          <small>Déclarer ce qui a été ouvert ou utilisé</small>
        </button>
        <button class="priority-card orange" data-action="navigate" data-route="actions">
          <span class="priority-icon">${icon("clipboard")}</span>
          <strong>Actions à traiter</strong>
          <small>Ce qu'il reste à faire maintenant</small>
          <span class="priority-value">${actions.length}<span>ouverte${actions.length > 1 ? "s" : ""}</span></span>
        </button>
        <button class="priority-card green" data-action="navigate" data-route="control">
          <span class="priority-icon">${icon("shield")}</span>
          <strong>Contrôle Juillet / Août</strong>
          <small>Reprise atomique · ${progress.complete} / ${progress.total} éléments</small>
          <span class="priority-value">${progress.percent}<span>%</span></span>
        </button>
        <button class="priority-card red" data-action="navigate" data-route="expiries">
          <span class="priority-icon">${icon("calendar")}</span>
          <strong>Péremptions</strong>
          <small>Actions à anticiper sans bloquer le départ</small>
          <span class="priority-value">4<span>à prévoir</span></span>
        </button>
      </div>
    </section>

    <div class="home-secondary">
      <section class="section">
        <div class="section-head"><h2>Matériel à surveiller</h2><button class="text-button" data-action="navigate" data-route="materials">Tout voir</button></div>
        <div class="card attention-list">
          ${attentionMaterials.map((material) => {
            const availability = availabilityFor(material.id);
            return `<button class="material-row" data-action="navigate" data-route="materials">
              <span class="material-icon ${materialIconClass(material.id)}">${icon(material.icon)}</span>
              <span class="material-copy"><strong>${material.name}</strong><small>${availability.cause}</small></span>
              <span class="status-pill ${availability.level}">${availability.label}</span>
            </button>`;
          }).join("")}
        </div>
      </section>
      <section class="section">
        <div class="section-head"><h2>Anticipation</h2></div>
        <button class="analysis-teaser" data-action="navigate" data-route="analysis">
          <span class="spark">${icon("trend")}</span>
          <span><strong>Analyse matériel</strong><small>KT 22G : couverture estimée à 8 jours. Voir les facteurs du signal.</small></span>
          ${icon("chevron", 18)}
        </button>
      </section>
    </div>
  `, "home");
}

function returnView() {
  const draft = state.returnDraft;
  return flowShell(`
    <header class="page-header">
      <div><p class="eyebrow">Déclaration rapide</p><h1 class="page-title">Qu'avez-vous ouvert ou utilisé&nbsp;?</h1><p class="page-subtitle">Sélectionnez directement le niveau physique le plus précis. Le sac parent sera déduit automatiquement.</p></div>
    </header>
    <div class="info-banner">${icon("clock", 19)}<div><strong>Objectif : moins de 10 secondes</strong>Aucune quantité n'est demandée ici. La déclaration crée une action de vérification.</div></div>
    <div class="tree">
      ${REFERENCE.containers.map((container) => renderTreeContainer(container, draft)).join("")}
    </div>
    ${draft.selectedNodeIds.length ? `<div class="selection-summary">${icon("check", 18)} <span>Le sac parent est déduit automatiquement.</span><strong>${draft.selectedNodeIds.length} sélection</strong></div>` : ""}
    <div class="sticky-action">
      <button class="primary-button" data-action="validate-return" ${draft.selectedNodeIds.length ? "" : "disabled"}>${icon("check", 19)} Valider le retour${draft.selectedNodeIds.length ? ` (${draft.selectedNodeIds.length})` : ""}</button>
    </div>
  `, "Retour SMUR", "home");
}

function renderTreeContainer(container, draft) {
  const open = draft.expandedContainerId === container.id;
  return `<div class="tree-group">
    <button class="tree-node ${open ? "open" : ""}" data-action="toggle-container" data-id="${container.id}">
      <span class="material-icon">${icon("bag", 19)}</span>
      <span class="tree-label"><strong>${container.name}</strong><small>${container.children.length} zones physiques</small></span>
      ${icon(open ? "chevronDown" : "chevron", 18)}
    </button>
    ${open ? container.children.map((child) => renderTreeChild(child, draft)).join("") : ""}
  </div>`;
}

function renderTreeChild(child, draft) {
  const hasChildren = child.children?.length;
  const open = draft.expandedChildId === child.id;
  const selected = draft.selectedNodeIds.includes(child.id);
  return `<button class="tree-node child ${open ? "open" : ""} ${selected ? "selected" : ""}" data-action="${hasChildren ? "toggle-child" : "select-node"}" data-id="${child.id}">
      <span class="tree-label"><strong>${child.name}</strong>${hasChildren ? `<small>${child.children.length} kits</small>` : ""}</span>
      ${selected ? `<span class="selected-check">${icon("check", 16)}</span>` : icon(hasChildren ? (open ? "chevronDown" : "chevron") : "chevron", 17)}
    </button>
    ${hasChildren && open ? child.children.map((node) => {
      const nodeSelected = draft.selectedNodeIds.includes(node.id);
      return `<button class="tree-node grandchild ${nodeSelected ? "selected" : ""}" data-action="select-node" data-id="${node.id}">
        <span class="tree-label"><strong>${node.name}</strong></span>
        ${nodeSelected ? `<span class="selected-check">${icon("check", 16)}</span>` : icon("chevron", 17)}
      </button>`;
    }).join("") : ""}`;
}

function returnSuccessView() {
  const verifyAction = actionFor("VERIFY_KIT", "kit-perfusion");
  return flowShell(`
    <div class="success-view">
      <div class="success-mark">${icon("check", 45)}</div>
      <p class="eyebrow">Retour enregistré</p>
      <h1>La relève est transmise.</h1>
      <p>Le Kit perfusion PÉDIA est maintenant identifié comme ouvert. Une action ciblée a été créée, sans modifier le stock théorique.</p>
      <div class="success-detail"><strong>Action créée</strong><small>Vérifier Kit perfusion · Sac vert PÉDIA</small></div>
      <div class="button-row" style="width:100%;max-width:420px">
        <button class="secondary-button" data-action="navigate" data-route="home">Accueil</button>
        <button class="primary-button" data-action="open-action" data-id="${verifyAction?.id || ""}">Traiter maintenant</button>
      </div>
    </div>
  `, "Retour SMUR", "home");
}

function actionsView() {
  const actions = openActions();
  return mainShell(`
    <header class="page-header"><div><p class="eyebrow">À faire maintenant</p><h1 class="page-title">Actions à traiter</h1><p class="page-subtitle">Une action décrit un geste concret. Sa gravité détermine séparément l'impact opérationnel.</p></div></header>
    <div class="action-list">
      ${actions.length ? actions.map((action) => actionCard(action)).join("") : `<div class="empty-state"><div class="empty-state-icon">${icon("check", 28)}</div><h3>Aucune action ouverte</h3><p>Le matériel ne présente aucune action connue à traiter.</p></div>`}
    </div>
    <section class="section">
      <button class="analysis-teaser" data-action="navigate" data-route="analysis"><span class="spark">${icon("chart")}</span><span><strong>Analyse & anticipation</strong><small>Comprendre l'usage normal, les anomalies et les défaillances.</small></span>${icon("chevron", 18)}</button>
    </section>
  `, "actions");
}

function actionCard(action) {
  const accent = action.severity === "blocking" ? "red" : action.type === "VERIFY_KIT" ? "blue" : "";
  const label = action.severity === "blocking" ? "Bloquante" : action.severity === "planned" ? "À prévoir" : "À traiter";
  const pill = action.severity === "blocking" ? "blocked" : action.severity === "planned" ? "plan" : "review";
  return `<button class="action-card" data-action="open-action" data-id="${action.id}">
    <span class="action-accent ${accent}"></span>
    <span class="action-copy"><span class="status-pill ${pill}">${label}</span><strong style="margin-top:8px">${escapeHtml(action.title)}</strong><p>${escapeHtml(action.detail)}</p><span class="action-meta"><span>${icon("clock", 14)} ${formatTime(action.createdAt)}</span><span>${icon("bag", 14)} ${action.containerId === "kit-perfusion" ? "Sac PÉDIA" : action.containerId === "fibrinolysis" ? "Fibrinolyse" : "Équipement"}</span></span></span>
    ${icon("chevron", 19)}
  </button>`;
}

function kitVerificationView(actionId) {
  const action = state.actions.find((entry) => entry.id === actionId) || actionFor("VERIFY_KIT", "kit-perfusion");
  if (!action || action.status !== "open") return notFoundView("Cette action a déjà été terminée.");
  state.kitCheck.actionId = action.id;
  const rows = REFERENCE.kitItems.map((item) => {
    const observation = state.kitCheck.observations[item.id];
    const missing = observation.verified && observation.present < item.expected;
    const complete = observation.verified && !missing;
    const stateClass = missing ? "missing" : complete ? "verified" : "";
    return `<article class="check-item ${stateClass}">
      <div class="check-item-head">
        <span class="check-state">${missing ? icon("close", 15) : complete ? icon("check", 16) : (REFERENCE.kitItems.indexOf(item) + 1)}</span>
        <span class="check-copy"><strong>${item.name}</strong><small>${item.expected} attendu${item.expected > 1 ? "s" : ""} · ${item.family}</small></span>
        <span class="qty-control" aria-label="Quantité présente"><button data-action="verify-qty" data-id="${item.id}" data-delta="-1" aria-label="Retirer une unité">−</button><span>${observation.present}</span><button data-action="verify-qty" data-id="${item.id}" data-delta="1" aria-label="Ajouter une unité">+</button></span>
      </div>
      ${observation.verified ? `<div class="atomic-note">${icon("check", 14)} Constat enregistré localement</div>` : `<button class="item-confirm full ${observation.present < item.expected ? "missing" : ""}" data-action="verify-confirm" data-id="${item.id}">${observation.present < item.expected ? `Confirmer : ${item.expected - observation.present} manquant${item.expected - observation.present > 1 ? "s" : ""}` : "Confirmer conforme"}</button>`}
    </article>`;
  }).join("");
  const verifiedCount = REFERENCE.kitItems.filter((item) => state.kitCheck.observations[item.id].verified).length;
  const missingItems = REFERENCE.kitItems.filter((item) => {
    const observation = state.kitCheck.observations[item.id];
    return observation.verified && observation.present < item.expected;
  });
  return flowShell(`
    <header class="page-header"><div><p class="eyebrow">Contrôle exploratoire</p><h1 class="page-title">Kit perfusion <span class="muted">· PÉDIA</span></h1><p class="page-subtitle">Le retour a signalé une ouverture sans préciser la consommation. Vérifiez le kit dans l'ordre physique.</p></div></header>
    <div class="warning-banner">${icon("alert", 19)}<div><strong>Kit déclaré ouvert</strong>Le contrôle est lié au référentiel v${state.kitCheck.referenceVersion}, figé pour cette vérification.</div></div>
    <div class="progress-wrap"><div class="progress-label"><span>Progression du kit</span><strong>${verifiedCount} / ${REFERENCE.kitItems.length}</strong></div><div class="progress-track"><div class="progress-bar" style="width:${Math.round(verifiedCount / REFERENCE.kitItems.length * 100)}%"></div></div></div>
    <div class="check-list">${rows}</div>
    ${missingItems.length ? `<div class="discrepancy-box"><strong>${missingItems.length} élément${missingItems.length > 1 ? "s" : ""} manquant${missingItems.length > 1 ? "s" : ""}</strong><ul>${missingItems.map((item) => `<li>${item.expected - state.kitCheck.observations[item.id].present} ${item.name}</li>`).join("")}</ul></div>` : ""}
    <div class="sticky-action"><button class="primary-button" data-action="finish-verification" ${verifiedCount === REFERENCE.kitItems.length ? "" : "disabled"}>Terminer la vérification${missingItems.length ? ` · ${missingItems.length} manquants` : ""}</button></div>
  `, "Vérification du kit", "actions");
}

function restockView(actionId) {
  const action = state.actions.find((entry) => entry.id === actionId) || actionFor("RESTOCK_KIT", "kit-perfusion");
  if (!action || !state.restock || action.status !== "open") return notFoundView("Ce réarmement est déjà terminé.");
  const stage = state.restock.stage;
  const collectionDone = state.restock.lines.every((line) => line.collected);
  const placementDone = state.restock.lines.every((line) => line.placed);
  return flowShell(`
    <header class="page-header"><div><p class="eyebrow">Réarmement ciblé</p><h1 class="page-title">${stage === "collect" ? "Préparer le réarmement" : "Placer dans le kit"}</h1><p class="page-subtitle">Seuls les écarts constatés sont présentés. Le reste du kit a déjà été vérifié.</p></div></header>
    <div class="tour-stepper"><div class="tour-step ${stage === "collect" ? "active" : "done"}"><span>${stage === "collect" ? "1" : icon("check", 18)}</span>À prendre</div><div class="tour-line"></div><div class="tour-step ${stage === "place" ? "active" : ""}"><span>2</span>À placer</div></div>
    ${stage === "collect" ? `<div class="info-banner">${icon("package", 19)}<div><strong>Réserve de réarmement</strong>Cochez chaque élément au moment où vous l'avez réellement en main.</div></div>` : `<div class="info-banner">${icon("bag", 19)}<div><strong>Sac vert PÉDIA → Sac rouge → Kit perfusion</strong>Confirmez le placement physique de chaque élément.</div></div>`}
    <div class="spacer-12"></div>
    <div class="card pick-list">
      ${state.restock.lines.map((line) => {
        const done = stage === "collect" ? line.collected : line.placed;
        return `<button class="pick-item ${done ? "done" : ""}" data-action="restock-toggle" data-id="${line.itemId}" data-phase="${stage}"><span class="pick-box">${icon("check", 17)}</span><span class="pick-copy"><strong>${line.quantity} × ${line.name}</strong><small>${stage === "collect" ? (done ? "Pris dans la réserve" : "À prendre") : (done ? "Placé dans le kit" : "À placer dans le Kit perfusion")}</small></span></button>`;
      }).join("")}
    </div>
    <div class="sticky-action">${stage === "collect" ? `<button class="primary-button" data-action="restock-next" ${collectionDone ? "" : "disabled"}>Continuer vers le Sac PÉDIA ${icon("chevron", 18)}</button>` : `<button class="primary-button" data-action="finish-restock" ${placementDone ? "" : "disabled"}>${icon("check", 19)} Valider la conformité</button>`}</div>
  `, "Réarmement", "actions");
}

function conformSuccessView() {
  return flowShell(`
    <div class="success-view">
      <div class="success-mark">${icon("shield", 46)}</div>
      <p class="eyebrow">Conformité retrouvée</p>
      <h1>Le kit est prêt à repartir.</h1>
      <p>Les deux éléments ont été replacés, les anomalies sont résolues et l'action de réarmement est terminée.</p>
      <div class="success-detail"><strong>Sac vert PÉDIA</strong><small>Prêt · aucune action bloquante connue</small></div>
      <button class="primary-button" style="max-width:420px" data-action="navigate" data-route="home">Retour à l'accueil</button>
    </div>
  `, "Réarmement terminé", "home");
}

function controlOverviewView() {
  const progress = auditProgress();
  const current = currentAuditItem();
  const active = activeZone();
  if (state.audit.status === "complete") return controlCompleteView();
  return flowShell(`
    <header class="page-header"><div><p class="eyebrow">Contrôle par zones</p><h1 class="page-title">${escapeHtml(state.audit.name)}</h1><p class="page-subtitle">Chaque geste est une micro-validation indépendante. La version du référentiel reste figée jusqu'à la fin.</p></div></header>
    <div class="info-banner">${icon("user", 19)}<div><strong>Responsable : ${escapeHtml(state.audit.responsible)}</strong>Débuté le 12/07/2026 · Référentiel v${escapeHtml(state.audit.referenceVersion)}</div></div>
    <div class="progress-wrap"><div class="progress-label"><span>Progression globale</span><strong>${progress.percent} % · ${progress.complete} / ${progress.total}</strong></div><div class="progress-track"><div class="progress-bar" style="width:${progress.percent}%"></div></div></div>
    ${current ? `<div class="success-banner">${icon("refresh", 19)}<div><strong>Reprise exacte disponible</strong>Prochain élément : ${escapeHtml(current.name)} dans ${escapeHtml(current.zoneName)}.</div></div>` : ""}
    <section class="section"><div class="section-head"><h2>Sac bleu RESPI</h2><span class="status-pill review">${REFERENCE.auditZones.filter((zone) => zoneProgress(zone).done).length} / ${REFERENCE.auditZones.length} zones</span></div><div class="zone-list">
      ${REFERENCE.auditZones.map((zone, index) => {
        const zp = zoneProgress(zone);
        const isCurrent = active?.id === zone.id;
        return `<div class="zone-row ${zp.done ? "done" : isCurrent ? "current" : ""}"><span class="zone-number">${zp.done ? icon("check", 16) : index + 1}</span><span class="zone-copy"><strong>${zone.name}</strong><small>${zp.complete} / ${zp.total} éléments ${zp.done ? "· terminé" : isCurrent ? "· en cours" : "· à faire"}</small></span>${zp.done ? icon("check", 18) : isCurrent ? icon("clock", 18) : ""}</div>`;
      }).join("")}
    </div></section>
    <div class="sticky-action"><button class="primary-button" data-action="navigate" data-route="control/item">Continuer · ${escapeHtml(current?.name || "élément suivant")}</button></div>
  `, "Contrôle bimestriel", "home");
}

function controlItemView() {
  const progress = auditProgress();
  const current = currentAuditItem();
  if (!current) return controlCompleteView();
  const zone = REFERENCE.auditZones.find((entry) => entry.id === current.zoneId);
  const zp = zoneProgress(zone);
  return flowShell(`
    <header class="page-header"><div><p class="eyebrow">${escapeHtml(zone.name)}</p><h1 class="page-title">Contrôle en cours</h1><p class="page-subtitle">La validation de cet élément est enregistrée immédiatement, sans attendre la fin du sac.</p></div></header>
    <div class="progress-wrap"><div class="progress-label"><span>Global · ${progress.complete} / ${progress.total}</span><strong>${progress.percent} %</strong></div><div class="progress-track"><div class="progress-bar" style="width:${progress.percent}%"></div></div></div>
    <article class="current-item-card">
      <span class="item-count">Élément ${zp.complete + 1} / ${zp.total} de cette zone</span>
      <h2>${escapeHtml(current.name)}</h2>
      <p>Vérifiez la présence, la conformité et, si nécessaire, le test fonctionnel.</p>
      <button class="primary-button" data-action="audit-conform" data-id="${current.id}">${icon("check", 19)} Conforme</button>
      <div class="spacer-8"></div>
      <button class="secondary-button" data-action="audit-anomaly" data-id="${current.id}">${icon("alert", 18)} Signaler une anomalie</button>
      <div class="atomic-note">${icon("shield", 15)} Le prochain tap sera sauvegardé localement</div>
    </article>
    <div class="section">
      <div class="warning-banner">${icon("refresh", 19)}<div><strong>Vous pouvez être interrompu</strong>Quittez puis revenez : l'application rouvrira directement sur le prochain élément non contrôlé.</div></div>
      <div class="spacer-12"></div>
      <button class="secondary-button" data-action="audit-pause">Quitter et reprendre plus tard</button>
    </div>
  `, "Contrôle bimestriel", "control");
}

function controlCompleteView() {
  return flowShell(`<div class="success-view"><div class="success-mark">${icon("shield", 45)}</div><p class="eyebrow">Contrôle terminé</p><h1>Sac bleu contrôlé.</h1><p>Toutes les micro-validations ont été enregistrées avec le référentiel v${state.audit.referenceVersion}.</p><button class="primary-button" style="max-width:420px" data-action="navigate" data-route="home">Retour à l'accueil</button></div>`, "Contrôle bimestriel", "home");
}

function materialsView() {
  return mainShell(`
    <header class="page-header"><div><p class="eyebrow">État connu</p><h1 class="page-title">Matériel</h1><p class="page-subtitle">La disponibilité opérationnelle et ses causes sont présentées séparément.</p></div></header>
    <div class="card attention-list">${MATERIALS.map((material) => {
      const status = availabilityFor(material.id);
      return `<button class="material-row" data-action="material-detail" data-id="${material.id}"><span class="material-icon ${materialIconClass(material.id)}">${icon(material.icon)}</span><span class="material-copy"><strong>${material.name}</strong><small>${status.cause}</small></span><span class="status-pill ${status.level}">${status.label}</span></button>`;
    }).join("")}</div>
    <section class="section"><div class="info-banner">${icon("shield", 19)}<div><strong>Lecture des statuts</strong>Une péremption à anticiper ne rend pas automatiquement un sac indisponible. Seules les causes bloquantes empêchent le départ.</div></div></section>
  `, "materials");
}

function searchView() {
  const normalized = searchQuery.trim().toLocaleLowerCase("fr");
  const items = [
    { name: "KT 22G", expected: 2, path: ["Sac vert PÉDIA", "Sac rouge", "Kit perfusion"] },
    { name: "KT 22G", expected: 1, path: ["Sac bleu RESPI", "Pochette voies veineuses"] },
    { name: "Biseptine", expected: 2, path: ["Sac vert PÉDIA", "Sac rouge", "Kit perfusion"] },
    { name: "Actilyse 50 mg", expected: 1, path: ["Sac jaune FIBRINOLYSE", "Compartiment principal"] }
  ];
  const results = normalized ? items.filter((item) => item.name.toLocaleLowerCase("fr").includes(normalized)) : [];
  return mainShell(`
    <header class="page-header"><div><p class="eyebrow">J'ai ça dans la main</p><h1 class="page-title">Rechercher un élément</h1><p class="page-subtitle">Commencez par le produit, puis retrouvez chaque emplacement physique attendu.</p></div></header>
    <div class="search-box">${icon("search", 21)}<input id="global-search" class="search-input" type="search" value="${escapeHtml(searchQuery)}" placeholder="KT 22G, Biseptine…" autocomplete="off" aria-label="Rechercher un matériel" /></div>
    <div class="quick-chips"><button class="chip" data-action="search-chip" data-query="KT 22G">KT 22G</button><button class="chip" data-action="search-chip" data-query="Biseptine">Biseptine</button><button class="chip" data-action="search-chip" data-query="Actilyse">Actilyse</button></div>
    <section class="section">
      ${normalized ? `<div class="section-head"><h2>${results.length} emplacement${results.length > 1 ? "s" : ""}</h2></div>${results.map((result) => `<article class="search-result"><h3>${result.name}</h3><div class="location-path">${result.path.map((part, index) => `${index ? icon("chevron", 13) : ""}<strong>${part}</strong>`).join("")}</div><span class="status-pill ready">${result.expected} attendu${result.expected > 1 ? "s" : ""}</span><div class="spacer-12"></div><button class="secondary-button" data-action="search-report">Signaler un manquant</button></article>`).join("") || `<div class="empty-state"><h3>Aucun résultat</h3><p>Essayez un nom de produit ou de matériel plus court.</p></div>`}` : `<div class="empty-state"><div class="empty-state-icon">${icon("hand", 28)}</div><h3>Qu'avez-vous dans la main&nbsp;?</h3><p>La recherche suit l'arborescence physique et vous mène au bon emplacement.</p></div>`}
    </section>
  `, "search");
}

function expiriesView() {
  const filtered = EXPIRIES.filter((item) => expiryFilter === "all" || (expiryFilter === "30" && item.days <= 30) || (expiryFilter === "90" && item.days > 30 && item.days <= 90) || (expiryFilter === "more" && item.days > 90));
  return flowShell(`
    <header class="page-header"><div><p class="eyebrow">Anticiper sans bloquer</p><h1 class="page-title">Péremptions</h1><p class="page-subtitle">Produits à traiter avec leur emplacement exact et leur impact réel.</p></div></header>
    <div class="segmented"><button class="${expiryFilter === "all" ? "active" : ""}" data-action="expiry-filter" data-filter="all">Toutes</button><button class="${expiryFilter === "30" ? "active" : ""}" data-action="expiry-filter" data-filter="30">≤ 30 j</button><button class="${expiryFilter === "90" ? "active" : ""}" data-action="expiry-filter" data-filter="90">30–90 j</button><button class="${expiryFilter === "more" ? "active" : ""}" data-action="expiry-filter" data-filter="more">&gt; 90 j</button></div>
    <div class="spacer-12"></div>
    <div class="card expiry-list">${filtered.map((item) => `<article class="expiry-row"><span class="expiry-accent ${item.days <= 30 ? "red" : ""}"></span><span class="expiry-copy"><strong>${item.name}</strong><small>${item.place}</small><small>Lot : ${item.lot}</small></span><span class="expiry-days ${item.days <= 30 ? "red" : ""}"><strong>${item.days}</strong>jours</span></article>`).join("")}</div>
  `, "Péremptions", "home");
}

function analysisView() {
  const stats = state.analytics;
  return flowShell(`
    <header class="page-header"><div><p class="eyebrow">30 derniers jours</p><h1 class="page-title">Analyse matériel</h1><p class="page-subtitle">Les signaux décrivent les flux logistiques. Ils ne modifient jamais la dotation officielle et ne prennent aucune décision médicale.</p></div></header>
    <div class="metrics"><div class="metric-card"><strong>${stats.restockings}</strong><span>Réarmements</span></div><div class="metric-card green"><strong>${stats.openings}</strong><span>Ouvertures déclarées</span></div><div class="metric-card orange"><strong>${stats.anomalies}</strong><span>Anomalies détectées</span></div><div class="metric-card red"><strong>${stats.expiries}</strong><span>Péremptions traitées</span></div></div>
    <section class="section"><div class="section-head"><h2>Tendances principales</h2></div><div class="card trend-list"><div class="trend-row"><span class="trend-arrow">↗</span><strong>KT 22G</strong><span class="trend-value">+75 %</span></div><div class="trend-row"><span class="trend-arrow">↗</span><strong>Biseptine</strong><span class="trend-value">+42 %</span></div><div class="trend-row"><span class="trend-arrow">→</span><strong>Compresses stériles</strong><span class="trend-value">stable</span></div></div></section>
    <section class="section"><div class="section-head"><h2>Risque à surveiller</h2><span class="status-pill blocked">Signal explicable</span></div><article class="risk-card"><div class="risk-head"><span class="risk-icon">${icon("alert", 21)}</span><span><strong>KT 22G · réserve faible</strong><small>Risque estimé avant le prochain approvisionnement</small></span></div><div class="risk-coverage"><span>Couverture estimée</span><strong>8 jours</strong></div><ul class="explain-list"><li>4 unités utilisées sur les 7 derniers jours</li><li>6 unités actuellement en réserve</li><li>Délai moyen d'approvisionnement configuré : 10 jours</li></ul></article></section>
    <section class="section"><div class="section-head"><h2>Qualité des données</h2></div><div class="data-families"><div class="family-row"><span class="family-dot"></span><strong>Usage normal</strong><span>32 événements</span></div><div class="family-row"><span class="family-dot orange"></span><strong>Écart de conformité</strong><span>${stats.anomalies} événements</span></div><div class="family-row"><span class="family-dot red"></span><strong>Défaillance</strong><span>4 événements</span></div></div></section>
    <section class="section"><div class="card card-pad"><span class="eyebrow">Temps de retour à conformité</span><div style="font-size:2rem;font-weight:850;letter-spacing:-.05em;color:var(--blue-dark)">${stats.averageResolution}</div><p class="page-subtitle">Moyenne entre la détection d'une action et sa résolution complète.</p></div></section>
  `, "Analyse & anticipation", "home");
}

function profileView() {
  const recentEvents = [...state.events].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
  return mainShell(`
    <header class="page-header"><div><p class="eyebrow">Traçabilité légère</p><h1 class="page-title">Profil & appareil</h1></div></header>
    <div class="card profile-card"><div class="avatar">GP</div><div class="profile-copy"><strong>${escapeHtml(state.user.name)}</strong><small>${escapeHtml(state.user.role)} · utilisateur mémorisé sur cet appareil</small></div></div>
    <section class="section"><div class="section-head"><h2>Configuration active</h2></div><div class="card settings-list"><div class="setting-row">${icon("wifi", 18)}<strong>Fonctionnement hors ligne</strong><span>Actif</span></div><div class="setting-row">${icon("shield", 18)}<strong>Référentiel</strong><span>v${REFERENCE.version}</span></div><div class="setting-row">${icon("clock", 18)}<strong>Dernière sauvegarde</strong><span>${formatTime(state.lastSavedAt)}</span></div></div></section>
    <section class="section"><div class="section-head"><h2>Historique récent</h2></div><div class="event-list">${recentEvents.map((event) => `<div class="event-row"><span class="event-icon">${icon(event.family === "failure" ? "activity" : event.type.includes("AUDIT") ? "clipboard" : "history", 18)}</span><span class="event-copy"><strong>${eventLabel(event)}</strong><small>${escapeHtml(event.subject)} · ${formatTime(event.at)} · ${escapeHtml(event.user)}</small></span></div>`).join("")}</div></section>
    <section class="section"><button class="danger-button" data-action="reset-demo">Réinitialiser les données de démonstration</button></section>
  `, "profile");
}

function eventLabel(event) {
  const labels = {
    FAILURE_REPORTED: "Défaillance déclarée",
    EXPIRY_DETECTED: "Péremption détectée",
    AUDIT_STARTED: "Contrôle commencé",
    CONTAINER_OPENED: "Ouverture déclarée",
    OBSERVATION_SAVED: "Constat enregistré",
    ANOMALIES_CONFIRMED: "Anomalies confirmées",
    RESTOCK_COMPLETED: "Réarmement terminé",
    AUDIT_ITEM_CHECKED: "Élément contrôlé",
    AUDIT_ANOMALY: "Anomalie de contrôle"
  };
  return labels[event.type] || event.type;
}

function notFoundView(message = "Cet écran n'est plus disponible.") {
  return flowShell(`<div class="empty-state"><div class="empty-state-icon">${icon("alert", 26)}</div><h3>${escapeHtml(message)}</h3><p>Revenez à la liste des actions pour consulter l'état actuel.</p><div class="spacer-16"></div><button class="primary-button" data-action="navigate" data-route="actions">Voir les actions</button></div>`, "Information", "home");
}

function render() {
  const [route, param] = routeParts();
  let html;
  switch (route) {
    case "home": html = homeView(); break;
    case "return": html = returnView(); break;
    case "return-success": html = returnSuccessView(); break;
    case "actions": html = actionsView(); break;
    case "verify": html = kitVerificationView(param); break;
    case "restock": html = restockView(param); break;
    case "conform-success": html = conformSuccessView(); break;
    case "control": html = param === "item" ? controlItemView() : controlOverviewView(); break;
    case "materials": html = materialsView(); break;
    case "search": html = searchView(); break;
    case "expiries": html = expiriesView(); break;
    case "analysis": html = analysisView(); break;
    case "profile": html = profileView(); break;
    default: html = homeView();
  }
  document.getElementById("app").innerHTML = html;
  document.title = `${route === "home" ? "Relève" : document.querySelector(".page-title")?.textContent || "Relève"} — SMUR`;
}

function addEvent(type, family, subject, user = state.user.name, extra = {}) {
  const event = { id: uid("event"), type, family, subject, at: nowIso(), user, ...extra };
  state.events.push(event);
  return event;
}

function validateReturn() {
  if (!state.returnDraft.selectedNodeIds.length) return;
  const selected = state.returnDraft.selectedNodeIds;
  selected.forEach((nodeId) => {
    const subject = nodeId === "kit-perfusion" ? "Kit perfusion PÉDIA" : nodeId;
    const event = addEvent("CONTAINER_OPENED", "usage", subject, state.user.name, { nodeId, containerId: "pedia", context: "Retour SMUR" });
    if (nodeId === "kit-perfusion" && !actionFor("VERIFY_KIT", "kit-perfusion")) {
      state.actions.push({
        id: uid("action-verify"),
        type: "VERIFY_KIT",
        status: "open",
        severity: "attention",
        containerId: "kit-perfusion",
        title: "Vérifier Kit perfusion PÉDIA",
        detail: "Ouvert après intervention · contenu à constater",
        createdAt: nowIso(),
        sourceEventId: event.id
      });
    }
  });
  state.analytics.openings += selected.length;
  state.returnDraft = { expandedContainerId: null, expandedChildId: null, selectedNodeIds: [] };
  saveState();
  navigate("return-success");
}

function openAction(id) {
  const action = state.actions.find((entry) => entry.id === id);
  if (!action) return navigate("actions");
  if (action.type === "VERIFY_KIT") return navigate(`verify/${action.id}`);
  if (action.type === "RESTOCK_KIT") return navigate(`restock/${action.id}`);
  if (action.type === "REPLACE_EXPIRY") return navigate("expiries");
  showToast("Le workflow de maintenance est hors du périmètre de ce prototype.");
}

function finishVerification() {
  const allVerified = REFERENCE.kitItems.every((item) => state.kitCheck.observations[item.id].verified);
  if (!allVerified) return;
  const missing = REFERENCE.kitItems.map((item) => {
    const observation = state.kitCheck.observations[item.id];
    return { itemId: item.id, name: item.name, quantity: Math.max(0, item.expected - observation.present) };
  }).filter((line) => line.quantity > 0);
  const verifyAction = state.actions.find((action) => action.id === state.kitCheck.actionId);
  if (verifyAction) {
    verifyAction.status = "closed";
    verifyAction.closedAt = nowIso();
  }
  if (!missing.length) {
    addEvent("OBSERVATION_SAVED", "compliance", "Kit perfusion conforme");
    saveState();
    return navigate("conform-success");
  }
  const anomalyEvent = addEvent("ANOMALIES_CONFIRMED", "compliance", "Kit perfusion PÉDIA", state.user.name, { anomalies: missing });
  state.analytics.anomalies += missing.length;
  const action = {
    id: uid("action-restock"),
    type: "RESTOCK_KIT",
    status: "open",
    severity: "attention",
    containerId: "kit-perfusion",
    title: `Réarmer Kit perfusion · ${missing.length} manquants`,
    detail: missing.map((line) => `${line.quantity} ${line.name}`).join(" · "),
    createdAt: nowIso(),
    sourceEventId: anomalyEvent.id
  };
  state.actions.push(action);
  state.restock = { actionId: action.id, stage: "collect", lines: missing.map((line) => ({ ...line, collected: false, placed: false })) };
  saveState();
  navigate(`restock/${action.id}`);
}

function finishRestock() {
  if (!state.restock?.lines.every((line) => line.placed)) return;
  const action = state.actions.find((entry) => entry.id === state.restock.actionId);
  if (action) {
    action.status = "closed";
    action.closedAt = nowIso();
  }
  const replaced = state.restock.lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity }));
  addEvent("RESTOCK_COMPLETED", "usage", "Kit perfusion PÉDIA", state.user.name, { replaced, resolutionSourceActionId: action?.id });
  state.analytics.restockings += replaced.reduce((sum, line) => sum + line.quantity, 0);
  REFERENCE.kitItems.forEach((item) => {
    state.kitCheck.observations[item.id] = { present: item.expected, verified: false, updatedAt: null };
  });
  state.kitCheck.actionId = null;
  state.restock = null;
  saveState();
  navigate("conform-success");
}

function recordAudit(result) {
  const item = currentAuditItem();
  if (!item) return;
  if (!state.audit.completedItemIds.includes(item.id)) state.audit.completedItemIds.push(item.id);
  state.audit.observations[item.id] = { result, at: nowIso(), user: state.user.name };
  state.audit.updatedAt = nowIso();
  addEvent(result === "compliant" ? "AUDIT_ITEM_CHECKED" : "AUDIT_ANOMALY", result === "compliant" ? "compliance" : "compliance", item.name, state.user.name, { auditId: state.audit.id, zoneId: item.zoneId, referenceVersion: state.audit.referenceVersion });
  if (result !== "compliant") {
    state.actions.push({ id: uid("action-audit"), type: "RESOLVE_ANOMALY", status: "open", severity: "attention", containerId: "respi", title: `Traiter l'anomalie · ${item.name}`, detail: `${item.zoneName} · anomalie constatée pendant le contrôle`, createdAt: nowIso() });
    state.analytics.anomalies += 1;
  }
  if (!currentAuditItem()) state.audit.status = "complete";
  saveState({ notify: true, message: result === "compliant" ? "Constat sauvegardé · élément suivant prêt" : "Anomalie sauvegardée · action créée" });
  render();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === "navigate") return navigate(button.dataset.route);
  if (action === "toggle-container") {
    state.returnDraft.expandedContainerId = state.returnDraft.expandedContainerId === button.dataset.id ? null : button.dataset.id;
    state.returnDraft.expandedChildId = null;
    saveState();
    return render();
  }
  if (action === "toggle-child") {
    state.returnDraft.expandedChildId = state.returnDraft.expandedChildId === button.dataset.id ? null : button.dataset.id;
    saveState();
    return render();
  }
  if (action === "select-node") {
    const id = button.dataset.id;
    const index = state.returnDraft.selectedNodeIds.indexOf(id);
    if (index >= 0) state.returnDraft.selectedNodeIds.splice(index, 1);
    else state.returnDraft.selectedNodeIds.push(id);
    saveState();
    return render();
  }
  if (action === "validate-return") return validateReturn();
  if (action === "open-action") return openAction(button.dataset.id);
  if (action === "verify-qty") {
    const observation = state.kitCheck.observations[button.dataset.id];
    observation.present = Math.max(0, observation.present + Number(button.dataset.delta));
    observation.verified = false;
    observation.updatedAt = nowIso();
    saveState();
    return render();
  }
  if (action === "verify-confirm") {
    const item = REFERENCE.kitItems.find((entry) => entry.id === button.dataset.id);
    const observation = state.kitCheck.observations[item.id];
    observation.verified = true;
    observation.updatedAt = nowIso();
    addEvent("OBSERVATION_SAVED", "compliance", item.name, state.user.name, { present: observation.present, expected: item.expected, referenceVersion: state.kitCheck.referenceVersion });
    saveState({ notify: true, message: `${item.name} · constat sauvegardé` });
    return render();
  }
  if (action === "finish-verification") return finishVerification();
  if (action === "restock-toggle") {
    const line = state.restock.lines.find((entry) => entry.itemId === button.dataset.id);
    if (button.dataset.phase === "collect") line.collected = !line.collected;
    else line.placed = !line.placed;
    saveState({ notify: true, message: button.dataset.phase === "collect" ? "Prise enregistrée" : "Placement enregistré" });
    return render();
  }
  if (action === "restock-next") {
    state.restock.stage = "place";
    saveState();
    return render();
  }
  if (action === "finish-restock") return finishRestock();
  if (action === "audit-conform") return recordAudit("compliant");
  if (action === "audit-anomaly") return recordAudit("anomaly");
  if (action === "audit-pause") {
    saveState({ notify: true, message: "Position exacte sauvegardée" });
    return navigate("home");
  }
  if (action === "search-chip") {
    searchQuery = button.dataset.query;
    return render();
  }
  if (action === "search-report") return showToast("Signalement rapide prévu dans l'itération suivante.");
  if (action === "expiry-filter") {
    expiryFilter = button.dataset.filter;
    return render();
  }
  if (action === "material-detail") return showToast("La fiche détaillée suivra l'arborescence physique du référentiel.");
  if (action === "reset-demo") {
    if (window.confirm("Réinitialiser tous les gestes enregistrés dans cette démonstration ?")) {
      state = createInitialState();
      saveState();
      navigate("home");
    }
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "global-search") return;
  searchQuery = event.target.value;
  const cursor = event.target.selectionStart;
  render();
  const input = document.getElementById("global-search");
  if (input) {
    input.focus();
    input.setSelectionRange(cursor, cursor);
  }
});

window.addEventListener("hashchange", render);
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    state = loadState();
    render();
  }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

if (!location.hash) history.replaceState(null, "", "#/home");
saveState();
render();
