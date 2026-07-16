# Relève — SMUR / Urgences

PWA mobile-first de préparation opérationnelle pour les retours d’intervention, contrôles, réarmements, péremptions, défauts fonctionnels et parcours dans le service.

Version actuelle : **0.5.0-p0 — 16/07/2026**.

> Le référentiel livré est un jeu de démonstration structuré à partir des documents fournis. Il doit être validé par l’établissement avant tout usage réel. L’application ne donne aucun conseil clinique, aucune posologie et aucune instruction thérapeutique.

## Démarrage local

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 4173
```

Ouvrir ensuite `http://127.0.0.1:4173/`. Le premier chargement doit être réalisé avec le serveur accessible ; le service worker met ensuite le shell et le référentiel en cache.

## Fonctions P0

- déclaration de retour d’intervention avec création automatique d’un contrôle ;
- contrôle élément par élément, reprise après interruption et écriture atomique ;
- génération d’anomalies et d’actions depuis les observations non conformes ;
- cycle collecte → vérification → remise en place → clôture ;
- disponibilité calculée depuis les anomalies ouvertes ;
- péremptions par horizons et planification de remplacement ;
- défaut fonctionnel, avec caractère bloquant décidé explicitement par l’utilisateur ;
- carte réelle du service et parcours regroupé par zone ;
- référentiel SMUR issu de 13 PDF et référentiels historiques issus de 3 classeurs ;
- IndexedDB, migration non destructive de l’ancien `localStorage`, journal et outbox locale ;
- fixtures synthétiques séparées des données de référence.

## Tests

Avec Node.js 20 ou plus :

```powershell
npm test
```

Les 17 tests couvrent le moteur d’actions, la disponibilité, les priorités, les péremptions, les conflits, le parcours, les statistiques, l’import des classeurs, les routes UI et les simulations terrain principales.

## Reconstruction du référentiel XLSX

Les classeurs sources restent en lecture seule. Pour régénérer le JSON applicatif :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\extract-xlsx-reference.ps1
```

L’extracteur exclut les signatures, identités, dates de péremption historiques, alertes et instructions.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Audit initial](docs/INITIAL_AUDIT.md)
- [Modèle de données](docs/DATA_MODEL.md)
- [Processus métier](docs/PROCESS_FLOWS.md)
- [Intégration des sources](docs/SOURCE_INTEGRATION.md)
- [Guide de configuration](docs/ADMINISTRATION_GUIDE.md)
- [Stratégie de tests](docs/TEST_STRATEGY.md)
- [Sécurité et confidentialité](docs/SECURITY.md)
- [Matrice de responsabilités](docs/RESPONSIBILITY_MATRIX.md)
- [État P0 à P3](docs/IMPLEMENTATION_STATUS.md)
