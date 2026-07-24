# Réserve 1 — caisses de kits d’urgence

Ce module contient les assets et les données nécessaires à l’exploration de la Réserve 1 dans la PWA.

## Contenu

- `reserve-01-entree-etagere-droite.png` : vue semi-réaliste depuis l’entrée.
- `reserve-01-kits-compose.png` : vue d’intégration avec les 10 repères de caisses.
- `planche-caisses-kits-reserve-01.png` : planche de contrôle des assets.
- `items/` : 10 caisses détourées sur fond transparent.
- `reserve-01-kits-inventaire.json` : inventaire exact issu du classeur.
- `item-assets-v2/items/` : 152 assets individuels détourés et légendés.
- `item-assets-v2/item-assets-index.json` : index des assets individuels.
- `item-assets-v2/planche-assets-individuels-01.png` à `04.png` : contrôle visuel complet.

Le JSON contient 10 kits et 323 lignes de matériel. Chaque ligne possède
`assetId` et `asset`. Les champs `sourceSheet` et `sourceCell` permettent de
retrouver chaque donnée dans le classeur d’origine.

Les 323 occurrences utilisent 152 variantes uniques « désignation + référence ».
Les matériels identiques partagent leur image maîtresse, mais conservent leurs
quantités, péremptions et cellules sources propres dans chaque caisse.

## Positionnement

La localisation connue est : **Réserve 1, étagère à droite en entrant**.

L’ordre actuel des caisses sur les cinq niveaux est une proposition de maquettage. Il est identifié par `requiresPhotoValidation: true` et doit être confirmé avec une photographie réelle de la réserve avant validation définitive.

## Source

`PEREMPTION MATERIELS.xlsx`, fourni le 24 juillet 2026.

Les libellés, références, quantités, péremptions et alertes sont reproduits depuis le classeur. Aucune donnée médicale ne doit être déduite ou complétée automatiquement.
