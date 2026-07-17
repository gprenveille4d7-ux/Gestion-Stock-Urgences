# Modèle de données

## Référentiel d’inventaire

`SourceDocument` conserve `id`, fichier, empreinte SHA-256, référence, révision, date et état d’import. Les états utilisés sont :

- `imported-from-source` pour une composition chargée ;
- `source-validated` pour une ligne conforme au texte contrôlé ;
- `source-ambiguity-to-validate` pour la seule ligne à confirmer ;
- `physical-layout-provisional` ou `physical-layout-validated` pour le rangement.

Un `Container` contient des `Section`. Un `ReferenceItem` conserve un identifiant stable, le produit, la quantité attendue, l’unité, le format éventuel, la catégorie, le contenant, la section, la source, la version et les ambiguïtés. Une structure inconnue n’efface aucune ligne : la section reste consultable et modifiable.

Les 357 lignes XLSX à quantité positive sont actives. Les six lignes dont la quantité source vaut zéro sont des `sourceAnnotations` visibles mais non activées ; aucune quantité positive n’est déduite à leur place.

## Stock vivant

Un `Lot` n’existe qu’après saisie terrain. Il conserve :

- `itemId` et un instantané du libellé de référence ;
- numéro de lot, mois/année et date de fin de mois calculée ;
- quantité réellement présente ;
- utilisateur et date de saisie ;
- emplacement constaté et état de son organisation ;
- statut, lot remplacé et historique.

Le référentiel ne génère jamais de numéro de lot ni de date de péremption.

## Journal opérationnel

- `Event` : fait immuable avec date, utilisateur, corrélation et version de référence ;
- `Audit` et `Observation` : contrôle et constat terrain ;
- `Anomaly` : écart ouvert ou résolu ;
- `Action` : workflow, priorité, lignes, lot et événements associés ;
- `Outbox` : événements locaux en attente d’une future synchronisation.

Le remplacement d’un lot suit `localiser`, `retirer`, `remplacer`, `valider`, puis `done`. L’ancien lot est archivé, le nouveau devient actif et l’action alimente le compteur du mois.

## Disponibilité

La disponibilité est calculée depuis les anomalies et actions réelles. Une ambiguïté documentaire attachée à une ligne n’indisponibilise pas le contenant. Une péremption prochaine crée une action logistique mais ne constitue pas, à elle seule, une règle clinique.
