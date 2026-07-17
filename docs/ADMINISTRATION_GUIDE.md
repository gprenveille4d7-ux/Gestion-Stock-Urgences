# Guide de configuration

## Mettre à jour une source

1. Conserver le document original en lecture seule.
2. Calculer son empreinte SHA-256 et mettre à jour `src/data/source-manifest.js`.
3. Conserver référence, version, date, sections, libellés et quantités source.
4. Marquer uniquement les lignes incertaines `source-ambiguity-to-validate`.
5. Régénérer le JSON XLSX avec `scripts/extract-xlsx-reference.ps1` lorsque nécessaire.
6. Exécuter les tests d’exhaustivité et comparer les écrans au snapshot source.

Une correction ne remplace jamais silencieusement le texte brut. Elle doit conserver la valeur source, le motif, l’auteur et la date de décision.

## Modifier l’organisation visuelle

Les schémas utilisent des coordonnées en pourcentage. Une disposition non relevée reste `physical-layout-provisional` et affiche « Organisation visuelle à préciser ». Ne passer à `physical-layout-validated` qu’après relevé sur place. Une zone inconnue doit rester accessible sous « Zone à préciser ».

## Régler les seuils de péremption

Les paramètres `urgentDays`, `rapidReplacementDays`, `anticipationDays` et `monitoringDays` sont logistiques. Ils sont stockés séparément du référentiel et ne constituent pas une règle médicale.

## Migration

Ne jamais vider IndexedDB pour une mise à jour. La migration courante retire uniquement les enregistrements dont `source` vaut `demo`, `demo-synthetic`, `synthetic`, `example` ou `seed-demo`, préserve les saisies utilisateur et consigne les identifiants supprimés dans `metadata`.

## Données nécessaires pour valider le rangement

- photos récentes des contenants ouverts ;
- ordre des faces, poches, pochettes et kits ;
- réserve, armoire, étagère et bac réellement constatés ;
- responsable, date et version de validation.
