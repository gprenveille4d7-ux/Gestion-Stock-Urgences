# Relève — prototype opérationnel SMUR

Prototype PWA mobile centré sur l'état de préparation opérationnelle, et non sur un stock comptable.

## Lancer localement

Servir le dossier avec n'importe quel serveur HTTP statique, par exemple :

```powershell
python -m http.server 4173
```

Puis ouvrir `http://localhost:4173`.

## Modèle métier retenu

Le référentiel versionné décrit ce qui doit être présent. Il est immuable pendant un contrôle. L'état terrain est dérivé de quatre journaux distincts :

1. `events` : ce qui s'est produit (ouverture, contrôle, remplacement) ;
2. `observations` : ce qui a été constaté ;
3. `actions` : ce qui reste à faire ;
4. `availability` : l'impact opérationnel calculé pour le contenant.

La boucle centrale est : **constater → générer une action → corriger → recalculer la disponibilité**.

Les données du prototype sont enregistrées dans `localStorage` après chaque geste. Le contrôle bimestriel conserve sa version de référentiel, son dernier élément validé et l'élément suivant exact.

## Parcours démontrés

- Retour SMUR → Sac PÉDIA → Kit perfusion → action créée.
- Action ouverte → contrôle du kit → deux manquants → tournée de réarmement → conformité retrouvée.
- Contrôle bimestriel à 64 % → fermeture/rechargement → reprise au prochain élément exact.

Le module Analyse sépare usage normal, écart de conformité et défaillance. Les alertes prédictives sont présentées comme des signaux explicables, jamais comme des décisions automatiques.
