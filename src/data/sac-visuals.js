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
  ouvert: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-ouvert.png`,
  amovible: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-amovible.png`,
  ampoulier: `${SAC_ROUGE_ASSET_ROOT}/sac-rouge-ampoulier.png`
});

export const SAC_ROUGE_VIEW_LABELS = Object.freeze({
  face: 'Sac rouge vu de face',
  troisQuartsGauche: 'Sac rouge vu de trois quarts gauche',
  gauche: 'Sac rouge vu du côté gauche',
  troisQuartsDroit: 'Sac rouge vu de trois quarts droit',
  droite: 'Sac rouge vu du côté droit',
  dos: 'Sac rouge vu de dos',
  dessus: 'Sac rouge vu du dessus',
  ouvert: 'Sac rouge ouvert',
  amovible: 'Sac amovible rouge ouvert',
  ampoulier: 'Ampoulier jaune extrait du sac rouge'
});

export const SAC_ROUGE_REMOVABLE_SECTION_IDS = Object.freeze([
  'kit-perfusion',
  'kit-paracetamol',
  'aiguilles',
  'kit-atb'
]);

export const SAC_ROUGE_SECTION_VIEWS = Object.freeze({
  'kit-perfusion': 'amovible',
  'kit-paracetamol': 'amovible',
  'kit-atb': 'amovible',
  aiguilles: 'amovible',
  'plaque-a': 'ouvert',
  'plaque-b': 'ouvert',
  'ampoulier-gauche': 'ampoulier',
  'ampoulier-droit': 'ampoulier',
  'ampoulier-interne': 'ampoulier',
  'lateral-droit': 'droite'
});

export function sacRougeViewForSection(sectionId) {
  const token = String(sectionId || '').split(':').at(-1);
  return SAC_ROUGE_SECTION_VIEWS[token] || 'face';
}

export const SAC_ROUGE_PRELOAD_IMAGES = Object.freeze([...new Set(Object.values(SAC_ROUGE_VIEWS))]);

const SAC_BLEU_ASSET_ROOT = './assets/sacs/sac-bleu';
const SAC_VERT_ASSET_ROOT = './assets/sacs/sac-vert';

export const BAG_PHOTO_CONFIGS = Object.freeze({
  [SAC_ROUGE_CONTAINER_ID]: Object.freeze({
    name: 'sac rouge',
    caption: 'Sac rouge · Vue générale',
    views: SAC_ROUGE_VIEWS,
    labels: SAC_ROUGE_VIEW_LABELS,
    sectionViews: SAC_ROUGE_SECTION_VIEWS
  }),
  'sac-bleu-respi': Object.freeze({
    name: 'sac bleu',
    caption: 'Sac bleu · Vue générale',
    views: Object.freeze({
      face: `${SAC_BLEU_ASSET_ROOT}/sac-bleu-face.png`,
      gauche: `${SAC_BLEU_ASSET_ROOT}/sac-bleu-cote-gauche.png`,
      droite: `${SAC_BLEU_ASSET_ROOT}/sac-bleu-cote-droit.png`,
      dos: `${SAC_BLEU_ASSET_ROOT}/sac-bleu-dos.png`,
      ouvert: `${SAC_BLEU_ASSET_ROOT}/sac-bleu-ouvert.png`
    }),
    labels: Object.freeze({
      face: 'Sac bleu vu de face',
      gauche: 'Sac bleu vu du côté gauche',
      droite: 'Sac bleu vu du côté droit',
      dos: 'Sac bleu vu de dos',
      ouvert: 'Sac bleu ouvert'
    }),
    sectionViews: Object.freeze({
      'intubation-gauche': 'ouvert',
      'intubation-centre': 'ouvert',
      'intubation-droit': 'ouvert',
      interne: 'ouvert',
      'lateral-droit': 'droite',
      'lateral-gauche': 'gauche'
    })
  }),
  'sac-vert-pedia': Object.freeze({
    name: 'sac vert',
    caption: 'Sac vert · Vue générale',
    views: Object.freeze({
      face: `${SAC_VERT_ASSET_ROOT}/sac-vert-face.png`,
      gauche: `${SAC_VERT_ASSET_ROOT}/sac-vert-cote-gauche.png`,
      droite: `${SAC_VERT_ASSET_ROOT}/sac-vert-cote-droit.png`,
      dos: `${SAC_VERT_ASSET_ROOT}/sac-vert-dos.png`,
      ouvert: `${SAC_VERT_ASSET_ROOT}/sac-vert-ouvert.png`
    }),
    labels: Object.freeze({
      face: 'Sac vert vu de face',
      gauche: 'Sac vert vu du côté gauche',
      droite: 'Sac vert vu du côté droit',
      dos: 'Sac vert vu de dos',
      ouvert: 'Sac vert ouvert'
    }),
    sectionViews: Object.freeze({
      ampoulier: 'ouvert',
      'kit-perfusion': 'ouvert',
      'kit-paracetamol': 'ouvert',
      'oxygene-aerosol': 'ouvert',
      'plaque-a': 'ouvert',
      'plaque-b': 'ouvert',
      intubation: 'ouvert',
      fond: 'ouvert',
      'sac-bleu': 'ouvert',
      'lateral-droit': 'droite',
      'lateral-gauche': 'gauche'
    })
  })
});

export function bagPhotoConfig(containerId) {
  return BAG_PHOTO_CONFIGS[containerId] || null;
}

export function bagViewForSection(containerId, sectionId) {
  const config = bagPhotoConfig(containerId);
  const token = String(sectionId || '').split(':').at(-1);
  return config?.sectionViews[token] || 'face';
}

export function bagPreloadImages(containerId) {
  const config = bagPhotoConfig(containerId);
  return config ? [...new Set(Object.values(config.views))] : [];
}
