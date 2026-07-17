import { REFERENCE_STATUS } from '../config.js';
import { OPERATIONAL_ASSETS } from './operational-assets.js';
import { SOURCE_DOCUMENTS } from './source-manifest.js';

const m = (quantity, label, sourceText = null, metadata = {}) => [quantity, label, 'medicament', sourceText, metadata];
const d = (quantity, label, sourceText = null, metadata = {}) => [quantity, label, 'dispositif', sourceText, metadata];
const e = (quantity, label, sourceText = null, metadata = {}) => [quantity, label, 'equipement', sourceText, metadata];
const c = (quantity, label, sourceText = null, metadata = {}) => [quantity, label, 'consommable', sourceText, metadata];

export const CONTAINER_KINDS = Object.freeze(['sac', 'valise', 'pochette', 'kit', 'armoire', 'chariot', 'tiroir', 'plateau', 'compartiment']);

function productIdFor(label) {
  const slug = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `product:${slug}`;
}

function makeSection(containerId, id, label, entries) {
  const items = entries.map(([expectedQuantity, itemLabel, category, sourceText, metadata = {}], index) => {
    const sourceStatus = metadata.sourceStatus
      || (['ambiguous-source', 'incomplete-source'].includes(metadata.dataQuality) ? 'source-ambiguity-to-validate' : 'source-validated');
    return Object.freeze({
      id: metadata.stableId || `${containerId}:${id}:${String(index + 1).padStart(2, '0')}`,
      containerId,
      sectionId: `${containerId}:${id}`,
      label: itemLabel,
      productId: productIdFor(itemLabel),
      expectedQuantity,
      unit: metadata.unit || 'unite',
      packSize: metadata.packSize || null,
      category,
      sourceText: sourceText || null,
      sourceStatus,
      expectedQuantitySource: metadata.expectedQuantitySource ?? expectedQuantity,
      quantityStatus: metadata.quantityStatus || (sourceStatus === 'source-ambiguity-to-validate' ? 'source-ambiguity-to-validate' : 'source-validated'),
      sourceLocator: metadata.sourceLocator || null,
      sizes: Object.freeze(metadata.sizes || []),
      legacyIds: Object.freeze(metadata.legacyIds || []),
      dataQuality: metadata.dataQuality || 'source-validated',
      validationIssues: Object.freeze(metadata.validationIssues || []),
      operationalUseAllowed: metadata.operationalUseAllowed !== false,
      expiryTracked: category !== 'equipement',
      criticality: 'non_evaluee',
      supplyZoneId: null,
      supplyZoneStatus: 'physical-layout-provisional'
    });
  });
  return Object.freeze({
    id: `${containerId}:${id}`,
    label,
    sourceStatus: items.some((item) => item.sourceStatus === 'source-ambiguity-to-validate')
      ? 'source-ambiguity-to-validate'
      : 'source-validated',
    physicalLayoutStatus: 'physical-layout-provisional',
    items: Object.freeze(items)
  });
}

function makeContainer({ id, label, shortLabel, color, sourceId, stockZoneId, stockZoneStatus = 'physical-layout-provisional', physicalLayoutStatus = 'physical-layout-provisional', sections }) {
  const kind = id.startsWith('valise-') ? 'valise' : id.startsWith('pochette-') ? 'pochette' : id.startsWith('kit-') ? 'kit' : id === 'frigo-medicaments' ? 'armoire' : 'sac';
  const source = SOURCE_DOCUMENTS.find((candidate) => candidate.id === sourceId);
  const normalizedSections = sections.map(([sectionId, sectionLabel, entries]) => makeSection(id, sectionId, sectionLabel, entries));
  return Object.freeze({
    id,
    label,
    shortLabel,
    color,
    kind,
    sourceId,
    sourceReference: source?.documentRef || null,
    sourceRevision: source?.revision || null,
    sourceDate: source?.sourceDate || null,
    stockZoneId,
    stockZoneStatus,
    sourceStatus: 'imported-from-source',
    physicalLayoutStatus,
    validationRequired: normalizedSections.some((section) => section.sourceStatus === 'source-ambiguity-to-validate'),
    sections: Object.freeze(normalizedSections)
  });
}

const z = (id, label, detail, x, y, tone, type, order) => Object.freeze({ id, label, detail, type, planId: 'plan-urgences-falaise', x, y, tone, order, active: true });

export const SERVICE_ZONES = Object.freeze([
  z('box-7', 'Box 7', 'Box de soins', 15.6, 8.5, 'box', 'box', 1),
  z('pc-ide', 'PC IDE', 'Poste infirmier en face du Box 2', 27.5, 8.5, 'pc', 'poste', 2),
  z('box-6', 'Box 6', 'Box de soins', 35.4, 8.5, 'box', 'box', 3),
  z('box-5', 'Box 5', 'Box de soins', 41.8, 8.5, 'box', 'box', 4),
  z('box-suture', 'Box Suture', 'En face des UHCD 4 et 5', 65.0, 8.5, 'box', 'box', 5),
  z('box-8', 'Box 8', 'Box de soins', 9.3, 25.5, 'box', 'box', 6),
  z('ioa', 'IOA', "Zone d'accueil", 9.3, 35.6, 'box', 'accueil', 7),
  z('box-p1', 'Box P1', 'Box de soins', 22.2, 25.5, 'box', 'box', 8),
  z('box-p2', 'Box P2', 'Box de soins', 22.2, 34.0, 'box', 'box', 9),
  z('box-2', 'Box 2', 'Box de soins', 29.0, 29.0, 'box', 'box', 10),
  z('box-3', 'Box 3', "Chariot d'urgence Box 3", 34.7, 28.8, 'box', 'box', 11),
  z('box-4', 'Box 4', "Chariot d'urgence Box 4", 40.6, 28.8, 'box', 'box', 12),
  z('reserve-1', 'Réserve 1', 'Matériel général, immédiatement à côté du Box 4', 46.5, 28.5, 'reserve1', 'reserve', 13),
  z('uhcd-1', 'UHCD 1', "Unité d'hospitalisation de courte durée", 51.9, 28.8, 'uhcd', 'uhcd', 14),
  z('uhcd-2', 'UHCD 2', "Unité d'hospitalisation de courte durée", 57.0, 28.8, 'uhcd', 'uhcd', 15),
  z('uhcd-3', 'UHCD 3', "Unité d'hospitalisation de courte durée", 62.3, 28.8, 'uhcd', 'uhcd', 16),
  z('uhcd-4', 'UHCD 4', "Unité d'hospitalisation de courte durée", 67.7, 28.8, 'uhcd', 'uhcd', 17),
  z('uhcd-5', 'UHCD 5', "Unité d'hospitalisation de courte durée", 73.0, 28.8, 'uhcd', 'uhcd', 18),
  z('uhcd-6', 'UHCD 6', "Unité d'hospitalisation de courte durée", 78.3, 28.8, 'uhcd', 'uhcd', 19),
  z('reserve-smur', 'Réserve SMUR', 'Sacs et matériel SMUR, après les UHCD', 83.2, 28.5, 'smur', 'reserve', 20),
  z('reserve-respi', 'Réserve Respi', 'Matériel respiratoire, après la Réserve SMUR', 89.4, 28.5, 'respi', 'reserve', 21),
  z('sas-1', 'SAS 1', "Premier sas d'accès", 12.0, 46.0, 'neutral', 'sas', 22),
  z('sas-2', 'SAS 2', "Second sas d'accès", 14.2, 63.0, 'neutral', 'sas', 23),
  z('cour-exterieure', 'Cour extérieure', 'Cour entre le service et le garage', 35.0, 70.0, 'neutral', 'cour', 24),
  z('garage-smur', 'Garage SMUR', 'Au fond de la cour, en bas à gauche', 15.4, 89.2, 'garage', 'garage', 25)
]);

export const SMUR_CONTAINERS = Object.freeze([
  makeContainer({
    id: 'valise-intra-osseuse', label: 'Valise intra-osseuse', shortLabel: 'IO', color: 'non-renseignee', sourceId: 'src-io', stockZoneId: 'reserve-smur',
    sections: [['principal', 'Inventaire source · rangement non documenté', [
      e(1, 'Perceuse intra-osseuse', 'PERCEUSE'),
      d(2, 'Aiguille intra-osseuse jaune 45 mm / 45GA (calibre source à confirmer) avec kit de fixation', 'INTRA OSSEUX JAUNES 45 mm / 45GA AVEC KIT DE FIXATIONS', { dataQuality: 'ambiguous-source', validationIssues: ['Calibre 45GA à confirmer'], operationalUseAllowed: false }),
      d(2, 'Aiguille intra-osseuse rose 15 mm / 15GA (calibre source à confirmer) avec kit de fixation', 'INTRA OSSEUX ROSES 15 mm / 15GA AVEC KIT DE FIXATIONS', { dataQuality: 'ambiguous-source', validationIssues: ['Calibre 15GA à confirmer'], operationalUseAllowed: false }),
      d(2, 'Aiguille intra-osseuse bleue 25 mm / 15GA (calibre source à confirmer) avec kit de fixation', 'INTRA OSSEUX BLEUS 25 mm / 15GA AVEC KIT DE FIXATIONS', { dataQuality: 'ambiguous-source', validationIssues: ['Calibre 15GA à confirmer'], operationalUseAllowed: false }),
      c(4, 'Tegaderm', 'TEGADERMS', { dataQuality: 'incomplete-source', validationIssues: ['Format non précisé'], operationalUseAllowed: false }),
      d(1, 'Tubulure 3 voies', 'TUBULURES 3 VOIES', { unit: 'tubulure' }),
      d(2, 'Seringue pré-remplie', 'SERINGUES PRE-REMPLIES', { dataQuality: 'incomplete-source', validationIssues: ['Contenu et volume non précisés'], operationalUseAllowed: false }),
      c(1, 'Sérum physiologique 50 mL', 'SERUM PHY 50 ML', { dataQuality: 'incomplete-source', validationIssues: ['Présentation et concentration non précisées'], operationalUseAllowed: false }),
      c(2, 'Paquet de 5 compresses stériles', 'PAQUETS DE 5 COMPRESSES STERILES', { unit: 'paquet', packSize: 5 }),
      c(1, 'Biseptine', 'BISEPTINE', { dataQuality: 'incomplete-source', validationIssues: ['Volume et présentation non précisés'], operationalUseAllowed: false }),
      c(2, 'Bande extensible 7 cm × 3 m', 'BANDES EXTENSIBLES 7 CM * 3M', { unit: 'bande' }),
      d(1, 'Seringue de 50 Luer Lock (unité source absente)', 'SERINGUE DE 50 LUER LOCK.', { unit: 'non_renseignee', dataQuality: 'ambiguous-source', validationIssues: ['Unité après 50 absente'], operationalUseAllowed: false })
    ]]]
  }),
  makeContainer({
    id: 'sac-vert-pedia', label: 'Sac vert n°1 — Pédia', shortLabel: 'PÉDIA', color: 'vert', sourceId: 'src-pedia', stockZoneId: 'reserve-smur',
    sections: [
      ['ampoulier', 'Sac amovible vert · Ampoulier', [m(2, 'Atropine 0,5 mg'), m(2, 'Adrénaline 1 mg'), m(1, 'Rivotril 1 mg'), m(2, 'Valium 10 mg'), m(3, 'Glucose 10 % 10 mL'), m(2, 'Nalbufine'), m(3, 'Bicarbonate 42 %', 'BICARBONATE 42%', { dataQuality: 'ambiguous-source', validationIssues: ['Concentration inhabituelle conservée telle qu’écrite dans la source'], operationalUseAllowed: false }), m(2, 'Solumédrol 40 mg'), m(1, 'Lidocaïne 1 %'), m(1, 'EPPI 10 mL'), m(2, 'Ceftriaxone 1 g')]],
      ['kit-perfusion', 'Sac rouge · Kit perfusion', [e(1, 'Garrot petit'), e(1, 'Garrot grand'), c(2, 'Paquet de 5 compresses stériles', null, { unit: 'paquet', packSize: 5 }), c(2, 'Biseptine'), c(1, 'Sparadrap'), c(2, 'Bande Nilex 5 cm'), e(1, 'Planchette rembourrée'), c(1, 'Sac poubelle'), c(1, 'Tegaderm grand'), c(4, 'Tegaderm petit'), c(1, 'NaCl 0,9 % 250 mL'), c(1, 'NaCl 0,9 % 10 mL'), d(1, 'Perfuseur 3 voies'), d(2, 'Cathéter 22 G bleu'), d(2, 'Cathéter 24 G jaune'), d(1, 'Seringue 10 mL'), d(1, 'Aiguille rose'), d(1, 'Prolongateur pédiatrique'), d(1, 'Bionecteur')]],
      ['kit-paracetamol', 'Kit paracétamol', [m(1, 'Paracétamol 500 mg'), d(1, 'Tubulure 3 voies')]],
      ['oxygene-aerosol', 'Sac vert · Kit oxygène et aérosol', [m(1, 'Célestène 0,05 % gouttes'), d(1, 'Masque haute concentration pédiatrique'), d(1, 'Prolongateur oxygène'), d(1, 'Lunettes à oxygène pédiatriques'), d(1, 'Lunettes à oxygène adultes'), d(2, 'Raccord SIM'), d(1, 'Masque aérosol pédiatrique'), m(3, 'Ventoline dosette 2,50 mg'), m(3, 'Ipratropium dosette 0,25 mg'), m(3, 'Pulmicort dosette 0,5 mg'), c(3, 'NaCl dosette 0,9 %')]],
      ['plaque-a', 'Plaque centrale · Face A', [d(5, 'Aiguille orange'), d(5, 'Aiguille bleue'), d(5, 'Aiguille rose'), d(2, 'Seringue 2 mL'), d(2, 'Seringue 5 mL'), d(2, 'Seringue 10 mL'), c(5, 'EPPI 20 mL'), m(2, 'Tube Emla avec Tegaderm'), m(3, 'Suppositoire Doliprane 100 mg rose'), m(3, 'Suppositoire Doliprane 200 mg orange'), m(3, 'Suppositoire Doliprane 300 mg vert')]],
      ['plaque-b', 'Plaque centrale · Face B', [d(3, 'Cathéter 24 G jaune'), d(3, 'Cathéter 22 G bleu'), d(1, 'Kit intra-osseux'), d(1, 'Épicrânienne bleue (libellé source : 3G)'), d(1, 'Épicrânienne orange (libellé source : 5G)')]],
      ['intubation', 'Sac intubation', [d(1, "Assortiment sondes d'intubation n° 2 à 6 par pas de 0,5 (1 de chaque)"), d(1, 'Masque n°3'), d(1, 'Seringue Omnifix 50 mL'), c(1, 'Sparadrap'), e(1, "Mandrin d'intubation"), e(1, 'Pince de Magill'), e(1, 'Lame de laryngoscope n°0'), e(1, 'Lame de laryngoscope n°1'), e(1, 'Lame de laryngoscope n°2'), d(1, 'Raccord SIM'), e(1, 'Manche laryngoscope acier'), m(1, 'Ventoline'), m(1, 'Xylocaïne 5 % nébuliseur'), e(1, 'Ampoule de laryngoscope'), e(4, 'Pile LR6'), d(1, 'Canule de Guedel taille 0'), d(1, 'Canule de Guedel taille 1'), d(1, 'Canule de Guedel taille 2'), d(2, 'Moustache de fixation')]],
      ['lateral-droit', 'Compartiment latéral droit', [d(1, 'Sonde gastrique n°10'), d(1, 'Sonde gastrique n°12'), d(1, 'Raccord SIM'), d(1, 'Stop vide'), d(1, "Sonde d'aspiration bronchique n°6"), d(1, "Sonde d'aspiration bronchique n°8"), d(1, "Sonde d'aspiration bronchique n°10"), d(1, "Sonde d'aspiration bronchique n°12")]],
      ['lateral-gauche', 'Compartiment latéral gauche', [e(1, 'Stéthoscope'), e(1, 'Brassard de tension nourrisson'), e(1, 'Brassard de tension enfant'), e(1, 'Couverture de survie'), e(1, 'Marteau à réflexes'), e(1, 'Lampe électrique'), e(1, 'Thermomètre'), e(1, 'Appareil glycémique avec bandelettes et aiguilles')]],
      ['fond', 'Fond du sac', [d(1, 'Insufflateur nourrisson avec réserve oxygène'), d(1, 'Insufflateur enfant avec réserve oxygène'), d(1, 'Masque à usage unique n°3'), d(1, 'Masque à usage unique n°4'), m(1, 'Gélofusine 4 %'), d(1, 'Airlife avec prolongateur'), d(1, 'Seringue Luer Lock'), d(1, 'Raccord O2')]],
      ['sac-bleu', 'Sac bleu interne', [d(1, 'Araignée de fixation'), d(1, 'Filtre avec prolongateur'), d(1, "Assortiment sondes d'intubation n°2 à n°6 par pas de 0,5 (1 de chaque)")]]
    ]
  }),
  makeContainer({
    id: 'sac-rouge-solutes', label: 'Sac rouge n°1 — Solutés', shortLabel: 'SOLUTÉS', color: 'rouge', sourceId: 'src-solutes', stockZoneId: 'reserve-smur',
    sections: [
      ['kit-perfusion', 'Sac amovible rouge · Kit perfusion', [c(1, 'NaCl 500 mL'), d(1, 'Perfuseur 3 voies'), c(5, 'Tegaderm'), d(2, 'Cathéter 18 G'), d(2, 'Cathéter 20 G'), c(2, 'Paquet de 5 compresses stériles', null, { unit: 'paquet', packSize: 5 }), c(1, 'Biseptine'), c(1, 'Dosette Bétadine alcoolique')]],
      ['kit-paracetamol', 'Kit paracétamol', [d(1, 'Perfuseur'), m(1, 'Paracétamol 1 g')]],
      ['kit-atb', 'Kit ATB', [c(2, 'NaCl 50 mL'), d(2, 'Perfuseur 3 voies'), d(2, 'Dispositif de transfert'), m(2, 'Rocephine'), m(2, 'Augmentin')]],
      ['aiguilles', 'Boîte à aiguilles', [e(1, 'Boîte à aiguilles')]],
      ['plaque-a', 'Plaque centrale · Face A', [d(2, 'Cathéter gris 16 G'), d(2, 'Cathéter vert 18 G'), d(2, 'Cathéter rose 20 G'), d(2, 'Cathéter bleu 22 G'), d(2, 'Cathéter jaune 24 G'), d(2, 'Épicrânienne 21 G'), c(5, 'EPPI 20 mL'), e(1, 'Garrot'), c(1, 'Sparadrap'), d(5, 'Bionecteur')]],
      ['plaque-b', 'Plaque centrale · Face B', [d(2, 'Seringue 20 mL'), d(5, 'Seringue 10 mL'), d(3, 'Seringue 5 mL'), d(2, 'Seringue 2 mL'), d(5, 'Aiguille verte'), d(5, 'Aiguille rose'), d(5, 'Aiguille bleue'), d(5, 'Aiguille orange'), d(5, 'Bouchon')]],
      ['ampoulier-gauche', 'Ampoulier · Côté gauche cardio-pneumo-réa', [m(2, 'Dobutamine'), m(2, 'Noradrénaline'), m(2, 'Salbutamol'), m(2, 'Loxen'), m(2, 'Solumédrol 120 mg'), m(2, 'Solumédrol 40 mg'), m(3, 'Atropine 0,5 mg'), m(2, 'Risordan'), m(5, 'Lasilix 20 mg'), m(2, 'Bricanyl'), m(2, 'Adrénaline 1 mg'), m(5, 'Adrénaline 5 mg'), m(3, 'Cordarone 150 mg'), m(2, 'Dopamine 200 mg'), m(2, 'Tildiem'), m(2, 'Digoxine')]],
      ['ampoulier-droit', 'Ampoulier · Côté droit', [m(3, 'Loxapac'), m(2, 'Tranxène 20 mg avec solvant'), m(3, 'Valium 10 mg'), m(3, 'Rivotril 1 mg avec solvant'), m(5, 'Nubain'), m(2, 'Polaramine'), m(2, 'Primpéran'), m(5, 'Narcan 0,4 mg'), m(2, 'Anexate (flumazénil)'), m(2, 'Gluconate de calcium'), m(2, 'Bicarbonate de sodium 42 %', '2 X BICARBONATES 42%', { dataQuality: 'ambiguous-source', validationIssues: ['Concentration inhabituelle conservée telle qu’écrite dans la source'], operationalUseAllowed: false }), m(6, 'Glucose 30 % 10 mL (ampoule plastique)'), m(2, 'IPP 40 mg')]],
      ['ampoulier-interne', 'Ampoulier · Compartiment interne', [c(2, 'NaCl 50 mL'), d(2, 'Perfuseur 3 voies'), d(1, 'Perfuseur Volumed'), d(2, 'Dispositif de transfert'), m(1, 'Penthrox'), m(4, 'Lidocaïne 200 mg'), m(5, 'Exacyl (acide tranexamique)'), m(4, 'Dépakine 400 mg'), m(5, 'Xanax 0,5'), m(2, 'Éphédrine 30 mg/10 mL IV en seringue pré-remplie')]],
      ['lateral-droit', 'Compartiment latéral droit', [e(1, 'Nécessaire dextro (appareil, 5 Unistix, 1 boîte de bandelettes)'), e(1, 'Brassard'), e(1, 'Stéthoscope'), e(1, 'Lampe'), e(1, 'Couverture de survie'), e(1, 'Thermomètre'), e(1, 'Ciseau')]]
    ]
  }),
  makeContainer({ id: 'sac-remplissage', label: 'Sac remplissage', shortLabel: 'REMPLISSAGE', color: 'bordeaux', sourceId: 'src-remplissage', stockZoneId: 'reserve-smur', sections: [['principal', 'Compartiment principal', [m(2, 'Gélofusine'), c(1, 'Glucose 10 % 500 mL'), m(1, 'Mannitol 20 %'), m(1, 'Bicarbonate 4,2 % 250 mL'), d(1, 'Transfuseur'), d(4, 'Tubulure')]]] }),
  makeContainer({ id: 'sac-plaies', label: 'Sac plaies, sutures et épistaxis', shortLabel: 'PLAIES', color: 'rose', sourceId: 'src-plaies', stockZoneId: 'reserve-smur', sections: [
    ['principal', 'Compartiment principal', [d(2, 'Agrafeuse'), c(1, 'Eau stérile 500 mL'), d(2, 'Paire de gants stériles taille 6'), d(2, 'Paire de gants stériles taille 6,5'), d(2, 'Paire de gants stériles taille 7'), d(2, 'Paire de gants stériles taille 7,5'), d(2, 'Paire de gants stériles taille 8'), d(2, 'Paire de gants stériles taille 8,5')]],
    ['epistaxis', 'Kit épistaxis', [d(2, 'Merocel 8 cm'), d(2, 'Rapid Rhino'), d(1, 'Seringue 10 mL')]],
    ['sutures', 'Kit pansement sutures', [d(1, 'Set suture'), c(6, 'Paquet de 5 compresses stériles', null, { unit: 'paquet', packSize: 5 }), d(2, 'Filapeau 3/0'), d(2, 'Prolène 4/0'), d(2, 'Pansement US 20 × 40 cm'), d(2, 'Pansement US 15 × 20 cm'), c(2, 'Biseptine'), c(1, 'Bétadine dermique'), c(2, 'Bande de crêpe 4 × 10 cm'), c(1, 'Leucoplast')]
  ]] }),
  makeContainer({ id: 'sac-orange-damage-control', label: 'Sac orange — Damage Control', shortLabel: 'DAMAGE CONTROL', color: 'orange', sourceId: 'src-damage-control', stockZoneId: 'reserve-smur', sections: [['principal', 'Compartiment principal', [e(2, 'Garrot tourniquet adulte'), e(2, 'Garrot tourniquet pédiatrique'), d(2, 'Kit pansement'), c(2, 'Champ de table'), c(2, 'Américain petit modèle'), c(2, 'Américain grand modèle'), d(1, 'Pansement israélien 13 × 18 cm'), d(1, 'Pansement israélien 10 × 15 cm'), d(1, 'Référence OAL 4'), d(1, 'Référence OAL 6'), d(5, 'QuickClot réf. 200 7,5 × 3,5'), c(4, 'Bande crêpe 4 × 10'), c(1, 'Sparadrap'), d(2, 'Agrafeuse'), d(2, 'Fil 3/0'), e(2, 'Pince hémostatique de Kelly'), d(2, 'Paire de gants stériles taille 6'), d(2, 'Paire de gants stériles taille 7'), d(2, 'Paire de gants stériles taille 8'), d(4, 'Masque de protection'), c(1, 'Flacon de Bétadine jaune')]]] }),
  makeContainer({ id: 'sac-noir-mater', label: 'Sac noir — Mater', shortLabel: 'MATER', color: 'noir', sourceId: 'src-mater', stockZoneId: 'reserve-smur', sections: [['principal', 'Sac amovible mater', [d(1, 'Champ accueil bébé réf. 714641'), d(1, 'Pack accouchement stérile'), d(1, 'Pack réfection épisiotomie'), d(1, 'Aspirateur de mucosités'), c(4, 'Coussin stérile'), c(1, 'Slip à usage unique'), d(1, 'Set soin de cordon ombilical'), d(1, 'Clamp ombilical hors set'), d(1, 'Paire de gants stériles n°7'), d(1, 'Paire de gants stériles n°7,5'), d(1, 'Paire de gants stériles n°8'), c(2, 'Paquet de 5 compresses stériles', null, { unit: 'paquet', packSize: 5 }), c(2, 'Biseptine'), c(1, 'Couche bébé'), c(1, 'Bonnet')]]] }),
  makeContainer({ id: 'sac-jaune-fibrinolyse', label: 'Sac jaune — Fibrinolyse', shortLabel: 'FIBRINOLYSE', color: 'jaune', sourceId: 'src-fibrinolyse', stockZoneId: 'reserve-smur', sections: [['principal', 'Compartiment principal', [m(2, 'Actilyse 50 mg'), m(2, 'Aspégic 500 mg IV'), m(1, 'Aspégic 1000 mg IV'), m(2, 'Héparine 25 000 UI'), d(2, 'Seringue 5 mL'), d(4, 'Aiguille rose'), m(2, 'Arixtra 2,5 mg'), m(2, 'Lovenox 1 mL / 10 000 UI'), m(1, 'Lovenox 0,6 mL / 6 000 UI'), m(1, 'Lovenox 0,4 mL / 4 000 UI'), d(2, 'Bionecteur'), d(2, 'Seringue 1 mL'), m(1, 'Flacon de sulfate de protamine'), m(4, 'Plavix 75 mg'), m(4, 'Plavix 300 mg'), m(12, 'Efient 10 mg'), m(4, 'Brilique 90 mg'), e(2, 'Rasoir'), d(1, 'Perfuseur'), c(3, 'NaCl 50 mL')]]] }),
  makeContainer({
    id: 'sac-bleu-respi', label: 'Sac bleu n°1 — Respi', shortLabel: 'RESPI', color: 'bleu', sourceId: 'src-respi', stockZoneId: 'reserve-respi',
    sections: [
      ['intubation-gauche', 'Pochette intubation · Gauche', [d(1, "Sonde d'intubation 6,5"), d(1, "Sonde d'intubation 7"), d(1, "Sonde d'intubation 7,5"), d(1, "Sonde d'intubation 8"), d(1, 'Seringue Omnifix 50 mL'), e(1, 'Mandrin'), e(1, 'Pince de Magill')]],
      ['intubation-centre', 'Pochette intubation · Centre', [c(1, 'Sparadrap'), d(1, 'Raccord Sherwood'), d(1, 'Raccord transparent'), e(1, 'Paire de lunettes de protection'), d(1, 'Canule de Guedel orange'), d(1, 'Canule de Guedel verte'), e(1, 'Manche pour laryngoscope acier'), m(1, 'Xylocaïne 5 % avec embout de pulvérisation long')]],
      ['intubation-droit', 'Pochette intubation · Droite', [e(1, 'Lame laryngoscope à usage unique n°2'), e(1, 'Lame laryngoscope à usage unique n°3'), e(1, 'Lame laryngoscope à usage unique n°4'), m(1, 'Ventoline spray'), d(4, 'Paire de gants non stériles'), e(2, 'Pile LR14')]],
      ['interne', 'Compartiment interne', [e(1, 'Airtraq taille verte'), e(1, 'Airtraq taille bleue'), d(1, 'Kit Minitrach'), d(1, "Sonde d'intubation CH 7"), d(1, "Sonde d'intubation CH 7,5"), d(1, 'Sonde de Salem CH 16'), d(1, 'Sonde de Salem CH 18'), d(1, 'Seringue à embout conique 60 mL'), d(1, 'Sac à urines'), c(1, 'Sparadrap'), d(1, 'Kit BAVU à usage unique avec masque')]],
      ['lateral-droit', 'Compartiment latéral droit', [d(2, "Sonde d'aspiration 18 Fr rouge"), d(3, "Sonde d'aspiration 16 Fr orange"), d(2, "Sonde d'aspiration 14 Fr verte"), d(2, "Sonde d'aspiration 12 Fr blanche"), d(2, "Sonde d'aspiration 10 Fr noire"), d(1, 'Stop vide'), d(2, 'Raccord biconique')]],
      ['lateral-gauche', 'Compartiment latéral gauche', [d(1, 'Lunettes O2'), d(1, 'Masque haute concentration'), d(1, 'Kit aérosol'), d(1, 'Raccord O2'), e(1, 'Peak flow'), d(1, 'Raccord SIM')]]
    ]
  }),
  makeContainer({ id: 'reserve-intubation', label: 'Réserve intubation — Sacoche bleue', shortLabel: 'INTUBATION', color: 'bleu', sourceId: 'src-intubation-reserve', stockZoneId: 'reserve-respi', sections: [['principal', 'Compartiment principal', [d(1, 'Insufflateur à usage unique avec masque'), d(1, "Sonde d'intubation taille 6,5"), d(2, "Sonde d'intubation taille 7"), d(2, "Sonde d'intubation taille 7,5"), d(1, "Sonde d'intubation taille 8"), e(1, 'Pince de Magill adulte'), d(1, 'Seringue 50 mL Luer Lock'), c(1, 'Leucoplast orange'), d(1, 'Canule de Guedel taille 2'), d(1, 'Canule de Guedel taille 3'), e(1, 'Laryngoscope'), e(2, 'Lame à usage unique Mac 2'), e(2, 'Lame à usage unique Mac 3'), e(2, 'Lame à usage unique Mac 4'), d(2, 'Masque laryngé taille 3'), d(2, 'Masque laryngé taille 4'), d(1, 'Raccord SIM'), d(1, 'Raccord biconique'), e(2, 'Pile LR14')]]] }),
  makeContainer({ id: 'pochette-toxiques', label: 'Pochette anesthésiques et toxiques VRM', shortLabel: 'TOXIQUES', color: 'violet', sourceId: 'src-toxiques', stockZoneId: 'reserve-smur', sections: [['principal', 'Pochette principale', [m(2, 'Tracrium — frigo'), m(2, 'Célocurine 100 mg / 2 mL — frigo'), m(2, 'Sufenta 250 µg / 5 mL'), m(2, 'Kétamine 50 mg / 5 mL'), m(2, 'Étomidate / Hypnomidate 20 mg'), m(2, 'Midazolam / Hypnovel 50 mg / 10 mL'), m(2, 'Propofol 200 mg / 20 mL'), m(6, 'Morphine 10 mg / 1 mL')]]] }),
  makeContainer({ id: 'frigo-medicaments', label: 'Frigo médicaments', shortLabel: 'FRIGO', color: 'cyan', sourceId: 'src-frigo', stockZoneId: 'pc-ide', sections: [['principal', 'Kit frigo', [m(4, 'Syntocinon ampoule'), m(3, 'Sandostatine ampoule'), m(2, 'Glucagen ampoule'), m(4, 'Striadine ampoule'), m(2, 'Atracurium 50 mg ampoule'), m(2, 'Célocurine 100 mg (suxaméthonium) ampoule')]]] }),
  makeContainer({ id: 'kit-serum-phy', label: 'Kit sérum physiologique', shortLabel: 'SÉRUM PHY', color: 'cyan', sourceId: 'src-serum-phy', stockZoneId: 'reserve-1', sections: [['principal', 'Kit principal', [c(6, 'NaCl 500 mL'), d(2, 'Perfuseur 3 voies')]]] })
]);

export const REFERENCE_ITEMS = Object.freeze(SMUR_CONTAINERS.flatMap((container) =>
  container.sections.flatMap((section) => section.items.map((item) => Object.freeze({
    ...item,
    containerLabel: container.label,
    sectionLabel: section.label,
    sourceId: container.sourceId,
    sourceReference: container.sourceReference,
    sourceRevision: container.sourceRevision,
    sourceDate: container.sourceDate,
    stockZoneId: container.stockZoneId,
    stockZoneStatus: container.stockZoneStatus,
    physicalLayoutStatus: section.physicalLayoutStatus
  })))
));

export const PRODUCTS = Object.freeze([...new Set(REFERENCE_ITEMS.map((item) => item.productId))].map((productId) => {
  const occurrences = REFERENCE_ITEMS.filter((item) => item.productId === productId);
  const item = occurrences[0];
  return Object.freeze({
    id: item.productId,
    label: item.label,
    category: item.category,
    expiryTracked: item.expiryTracked,
    criticality: item.criticality,
    synonyms: Object.freeze([]),
    attributes: Object.freeze({ size: null, dosage: null, concentration: null, volume: null, functionalTestRequired: null, lotTrackingRequired: item.expiryTracked }),
    sourceStatus: occurrences.some((occurrence) => occurrence.sourceStatus === 'source-ambiguity-to-validate')
      ? 'source-ambiguity-to-validate'
      : 'source-validated'
  });
}));

export const COMPOSITIONS = Object.freeze(SMUR_CONTAINERS.map((container) => {
  const source = SOURCE_DOCUMENTS.find((candidate) => candidate.id === container.sourceId);
  return Object.freeze({
    id: `composition:${container.id}:${source?.revision || 'draft'}`,
    containerId: container.id,
    version: `${source?.documentRef || container.sourceId}-${source?.revision || 'draft'}-${source?.sourceDate || 'unknown'}`,
    officialReference: source?.documentRef || null,
    createdAt: source?.sourceDate || null,
    effectiveFrom: null,
    effectiveTo: null,
    status: 'imported-from-source',
    expectedItemIds: Object.freeze(container.sections.flatMap((section) => section.items.map((item) => item.id))),
    modifications: Object.freeze([]),
    validatedBy: null
  });
}));

export const REFERENCE_NODES = Object.freeze([
  Object.freeze({ id: 'service:urgences-falaise', kind: 'service', label: 'Urgences — Centre Hospitalier de Falaise', parentId: null, active: true }),
  ...SERVICE_ZONES.map((zone) => Object.freeze({ ...zone, id: `zone:${zone.id}`, externalId: zone.id, kind: 'zone', parentId: 'service:urgences-falaise', active: true })),
  ...SMUR_CONTAINERS.flatMap((container) => [
    Object.freeze({
      id: container.id,
      kind: container.kind,
      label: container.label,
      parentId: container.stockZoneStatus === 'physical-layout-validated' ? `zone:${container.stockZoneId}` : 'service:urgences-falaise',
      proposedParentId: container.stockZoneStatus === 'physical-layout-validated' ? null : `zone:${container.stockZoneId}`,
      locationStatus: container.stockZoneStatus,
      mobile: container.kind !== 'armoire',
      order: 0,
      active: true
    }),
    ...container.sections.flatMap((section, sectionIndex) => [
      Object.freeze({ id: section.id, kind: 'compartiment', label: section.label, parentId: container.id, mobile: false, order: sectionIndex, active: true }),
      ...section.items.map((item, itemIndex) => Object.freeze({ id: `node:${item.id}`, kind: 'element', label: item.label, parentId: section.id, productId: item.productId, order: itemIndex, active: true }))
    ])
  ])
]);

export const REFERENCE = Object.freeze({
  ...REFERENCE_STATUS,
  sources: SOURCE_DOCUMENTS,
  zones: SERVICE_ZONES,
  containers: SMUR_CONTAINERS,
  products: PRODUCTS,
  compositions: COMPOSITIONS,
  nodes: REFERENCE_NODES,
  assets: OPERATIONAL_ASSETS
});

export function findReferenceItem(itemId) {
  return REFERENCE_ITEMS.find((item) => item.id === itemId || item.legacyIds.includes(itemId)) || null;
}

export function findContainer(containerId) {
  return SMUR_CONTAINERS.find((container) => container.id === containerId) || null;
}

export function findZone(zoneId) {
  return SERVICE_ZONES.find((zone) => zone.id === zoneId) || null;
}
