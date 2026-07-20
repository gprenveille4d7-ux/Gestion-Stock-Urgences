const SAC_ROUGE_ASSET_ROOT = './assets/sacs/sac-rouge';

export const SAC_ROUGE_CONTAINER_ID = 'sac-rouge-solutes';

export const SAC_ROUGE_VIEWS = Object.freeze({
  face: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-face.png`,
  troisQuartsGauche: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-trois-quarts-gauche.png`,
  gauche: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-cote-gauche.png`,
  troisQuartsDroit: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-trois-quarts-droit.png`,
  droite: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-cote-droit.png`,
  dos: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-dos.png`,
  dessus: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-dessus.png`,
  ouvert: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-ouvert.png`
});

export const SAC_ROUGE_VIEW_LABELS = Object.freeze({
  face: 'Sac rouge vu de face',
  troisQuartsGauche: 'Sac rouge vu de trois quarts gauche',
  gauche: 'Sac rouge vu du côté gauche',
  troisQuartsDroit: 'Sac rouge vu de trois quarts droit',
  droite: 'Sac rouge vu du côté droit',
  dos: 'Sac rouge vu de dos',
  dessus: 'Sac rouge vu du dessus',
  ouvert: 'Sac rouge ouvert'
});

export const SAC_ROUGE_SECTION_VIEWS = Object.freeze({
  'kit-perfusion': 'ouvert',
  'kit-paracetamol': 'ouvert',
  'kit-atb': 'ouvert',
  aiguilles: 'ouvert',
  'plaque-a': 'ouvert',
  'plaque-b': 'ouvert',
  'lateral-droit': 'droite'
});

export function sacRougeViewForSection(sectionId) {
  const token = String(sectionId || '').split(':').at(-1);
  return SAC_ROUGE_SECTION_VIEWS[token] || 'face';
}

export const SAC_ROUGE_PRELOAD_IMAGES = Object.freeze([...new Set(Object.values(SAC_ROUGE_VIEWS))]);
