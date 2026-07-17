export const SOURCE_DOCUMENTS = Object.freeze([
  { id: 'src-io', fileName: 'valises_intra_osseuses.pdf', sha256: '25bbb0fb1bfb6022b1983193e1fc4724d20d8520e661ec649a57e5ac252683bb', documentRef: 'URG.ENR.053', revision: 'V1', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-pedia', fileName: 'sac_vert_n_1_pedia.pdf', sha256: '2ff42bf58d97c7dff864e6051e10dda160043c029cc0276c6e539e87241e9cd8', documentRef: 'URG.ENR.052', revision: 'V1', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-solutes', fileName: 'sac_rouge_n_1_solutes.pdf', sha256: '8bebc88322b3fde40f59308c52ccefc999c39420c5c84ab8372c706b81294696', documentRef: 'URG.ENR.051', revision: 'V1', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-remplissage', fileName: 'sac_remplissage.pdf', sha256: '104140a41dc147ee1777389efc4bc2dca2b326a4a790b2802d3f39a5f4bd2656', documentRef: 'URG.ENR.050', revision: 'V1', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-plaies', fileName: 'sac_plaies_suturesepistaxis.pdf', sha256: '98ad35602398a53ae6934e11e0c3369a9977ca573e55a0536c1ac205e80be764', documentRef: 'URG.ENR.049', revision: 'V1', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-damage-control', fileName: 'sac_orange_damage_control.pdf', sha256: '85b1028dbc3144599cedb3c88464dc34501bb574d2ab8dd61ae53f2a84d883d7', documentRef: 'URG.ENR.048', revision: 'V1', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-mater', fileName: 'sac_noir_mater.pdf', sha256: 'fcf7a508f7d2a9ccd322913fb618edf8c196c79f813a7358e797ed4f43dcde98', documentRef: 'URG.ENR.047', revision: 'V1', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-fibrinolyse', fileName: 'sac_jaune_fibrinolyse.pdf', sha256: '34173a283bbf4514894074bf195582ba06037b8861a527505e0bf1b0e6becff9', documentRef: 'URG.ENR.046', revision: 'V1', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-respi', fileName: 'sac_bleu_n_1_respi.pdf', sha256: 'd5ff85d0218b244a39c1ddf7d38cb5dcd954fdb843584aebda7b8feec11d05f8', documentRef: 'URG.ENR.045', revision: 'V1', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-intubation-reserve', fileName: 'reserve_intubation_sacoche_bleue.pdf', sha256: '480a3f24ed7d18147c77c116d37c7f08762f6fc6afd74a05c102c2ccb20a93d6', documentRef: 'URG.ENR.044', revision: 'V1', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-toxiques', fileName: 'pochette_anesthesiques_et_toxiques.pdf', sha256: '57021099e5c35bf446326a1898b855260d88734481ae9710762b188c2fad42d5', documentRef: 'URG.ENR.043', revision: 'V2', sourceDate: '2025-11', status: 'imported-from-source' },
  { id: 'src-frigo', fileName: 'enregistrement_composition_du_kit_frigo_medicaments.pdf', sha256: '4957af9c1a3f339be8dbd6ccb89797f3a6443ac7c7b9eda7b1ad6244f37eb32d', documentRef: 'URG.ENR.040', revision: 'V1', sourceDate: '2024-02', status: 'imported-from-source' },
  { id: 'src-serum-phy', fileName: 'composition_kit_serum_phy.pdf', sha256: '52a27f9e4c3499bb424c2c11e92c946d1d02229176af62cbf621c4560f213bc3', documentRef: 'URG.DA.029', revision: 'V1', sourceDate: '2025-07', status: 'imported-from-source' },
  { id: 'src-chariots-pedia', fileName: 'Verification peremptions chariot urgence pediatrique.xlsx', sha256: '371c0c953aa5c142a66312c9448ad1a2b41a13972ace9909d19a6389229f7dfe', documentRef: 'URG.ENR.007', revision: 'V4', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-chariot-box4', fileName: 'URG.ENR.007 Vérification chariot urgence BOX 4 2024 mars.xlsx', sha256: '3019a0638429236730acae1b7eab73e1d06c8e8266a0d820d5103d50fd8e7fea', documentRef: 'URG.ENR.007', revision: 'V4', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-chariot-box3', fileName: 'URG.ENR.007 Vérification chariot urgence MARS 2024 BOX 3 2024.xlsx', sha256: '5a8ac6419aaf322142d808ed232b472014aa9ec2181c8aec3e6b482935fb7db8', documentRef: 'URG.ENR.007', revision: 'V4', sourceDate: '2024-03', status: 'imported-from-source' },
  { id: 'src-email-history', fileName: 'sacs smur.eml', sha256: '20eb548ef58ea241aeb9057109da476fb35d441f1ac6a1052cd511c42ac619a4', sourceDate: '2024-01-04', status: 'historical-context-only', imported: false, exclusion: 'Pièces jointes anciennes, photos de lots et données personnelles non publiées.' },
  { id: 'src-orders-history', fileName: 'COMMANDES.doc', sha256: 'b1cc5eb90d47b99f45720a76f39e8ddbd56fdecdaac8f9cf68e8dfc18f16b47e', status: 'historical-context-only', imported: false, exclusion: 'Planning ancien non validé.' }
]);

export const EXCLUDED_SOURCE_CONTENT = Object.freeze([
  { label: 'Dilutions anesthésiques', reason: 'Instruction clinique/posologique hors périmètre de l’application.' },
  { label: 'Procédure détaillée respirateur Osiris', reason: 'Procédure technique ancienne non validée pour un usage opérationnel.' },
  { label: 'Signatures et identités des documents', reason: 'Minimisation des données personnelles.' },
  { label: 'Dates de péremption et lots historiques', reason: 'Données historiques non importées dans le stock vivant ; seuls les lots saisis sur le terrain sont suivis.' }
]);
