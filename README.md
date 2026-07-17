# Relève — SMUR / Urgences

PWA mobile-first de préparation opérationnelle : inventaires, retours d’intervention, contrôles, réarmements, péremptions, défauts fonctionnels et historique local.

Version actuelle : **1.0.0 — 17/07/2026**.

Le référentiel actif est importé des 13 PDF et 3 classeurs fournis. Les compositions théoriques sont séparées du stock vivant : aucun lot, numéro, date de péremption, contrôle ou action n’est créé au premier démarrage. L’application ne fournit ni conseil clinique, ni posologie, ni instruction thérapeutique.

## Démarrage local

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 4173
```

Ouvrir `http://127.0.0.1:4173/`. Après le premier chargement, le service worker conserve le shell et les référentiels pour la consultation hors ligne.

## Fonctions principales

- consultation des 16 inventaires actifs, de leurs sources, versions, sections et quantités théoriques ;
- organisation visuelle provisoire et modifiable lorsque le rangement physique n’est pas documenté ;
- saisie terrain des lots, dates de péremption, quantités présentes et emplacements constatés ;
- quatre filtres colorés de péremption et parcours Localiser → Retirer → Remplacer → Valider ;
- contrôles, écarts, actions, défauts et disponibilité calculés depuis les seules saisies réelles ;
- IndexedDB, historique traçable, migration sélective des anciens enregistrements synthétiques et fonctionnement hors ligne.

## Tests

Avec Node.js 20 ou plus :

```powershell
npm test
```

Les tests couvrent le référentiel, l’exhaustivité des sources, une installation neuve, la migration, le stock vivant, le parcours de remplacement, les schémas visuels, l’interface mobile et le cache hors ligne.

## Reconstruction du référentiel XLSX

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\extract-xlsx-reference.ps1
```

Les 357 lignes à quantité positive restent actives. Six lignes dont la quantité source vaut zéro restent visibles comme annotations à confirmer, sans quantité inventée. Les signatures, identités, péremptions historiques, alertes et instructions ne sont pas importées dans le stock vivant.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Modèle de données](docs/DATA_MODEL.md)
- [Processus métier](docs/PROCESS_FLOWS.md)
- [Intégration des sources](docs/SOURCE_INTEGRATION.md)
- [Guide de configuration](docs/ADMINISTRATION_GUIDE.md)
- [Stratégie de tests](docs/TEST_STRATEGY.md)
- [Sécurité et confidentialité](docs/SECURITY.md)
- [Inventaires visuels](docs/VISUAL_INVENTORIES.md)
