# Architecture technique

L’application est une PWA statique fondée sur des modules JavaScript natifs, IndexedDB et un service worker.

```text
Interface mobile et routes
        ↓ commandes
OperationalStore — cas d’usage et stock vivant
        ↓ événements et transactions
Domaines — disponibilité, actions, péremptions, parcours, statistiques
        ↓
Repository — IndexedDB, journal de migration et outbox locale
        ↑
Référentiel versionné — PDF/XLSX, indépendant du stock vivant
```

## Couches

- `src/data/` : référentiel, provenance, import XLSX et schémas visuels ;
- `src/domain/` : fonctions pures, sans DOM ni stockage ;
- `src/infrastructure/` : IndexedDB, transactions et synchronisation locale ;
- `src/application/` : orchestration des cas d’usage et journalisation ;
- `src/ui/` : rendu mobile, navigation et accessibilité ;
- `sw.js` : cache hors ligne versionné ;
- `tests/` : domaine, exhaustivité, interface et terrain.

## Règles

1. L’interface n’écrit jamais directement dans IndexedDB.
2. Le référentiel théorique ne crée aucun lot, date ou numéro opérationnel.
3. Chaque saisie terrain produit un événement et conserve son auteur local et sa date.
4. Une ambiguïté reste attachée à sa ligne ; elle ne bloque pas tout le contenant.
5. La disponibilité et les compteurs sont des projections calculées.
6. Les changements liés à une action sont écrits de façon atomique.
7. Les structures physiques provisoires sont distinctes des implantations validées.

## Stockage et migration

La base `releve-smur-operational`, version 3, contient des stores séparés pour événements, contrôles, observations, anomalies, actions, lots, paramètres, utilisateurs locaux, métadonnées et outbox. La migration `synthetic-data-removal-v3` retire uniquement les enregistrements portant une source explicitement synthétique, préserve les saisies utilisateur et journalise les identifiants retirés.

L’adaptateur reste `local-only`. Une synchronisation serveur future devra être idempotente, authentifiée et résoudre explicitement les conflits.
