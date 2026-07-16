# Architecture technique

## Choix directeur

L’application reste déployable comme site statique sans chaîne de compilation. Elle utilise des modules JavaScript natifs, IndexedDB et un service worker. Ce choix conserve la simplicité du prototype tout en séparant réellement les responsabilités. TypeScript ou un framework pourront être introduits plus tard sans modifier le modèle métier.

```text
UI mobile / routes par hash
        │ commandes utilisateur
        ▼
OperationalStore (cas d’usage)
        │ événements + conséquences
        ▼
Moteurs de domaine ──► disponibilité / actions / péremptions / parcours / statistiques
        │ transactions atomiques
        ▼
Repository ──► IndexedDB ──► outbox locale ──► futur adaptateur serveur
        ▲
Référentiel versionné PDF/XLSX + fixtures synthétiques séparées
```

## Couches

- `src/data/` : référentiel, provenance, import XLSX généré et fixtures de démonstration ;
- `src/domain/` : fonctions pures et testables, sans DOM ni stockage ;
- `src/infrastructure/` : IndexedDB, repository transactionnel et contrat de synchronisation ;
- `src/application/` : orchestration des cas d’usage et journalisation ;
- `src/ui/` : rendu, navigation, accessibilité et événements de l’interface ;
- `app.js` : point d’entrée minimal ;
- `sw.js` : cache PWA versionné et stratégie réseau d’abord ;
- `tests/` : tests unitaires et d’intégration du domaine.

## Règles d’architecture

1. L’interface n’écrit jamais directement dans IndexedDB.
2. Un fait opérationnel produit un événement immuable.
3. Une observation non conforme, son anomalie et son action sont enregistrées dans la même transaction.
4. La disponibilité est une projection calculée ; elle n’est jamais saisie manuellement comme un état isolé.
5. Une composition source n’est activable qu’après validation institutionnelle explicite.
6. Les fixtures portent `source: demo-synthetic` et ne sont pas confondues avec les documents sources.
7. Le rôle local prépare les autorisations futures mais ne constitue pas une authentification.

## Stockage et évolution

La base `releve-smur-operational`, version 2, contient des stores distincts, dont les utilisateurs de démonstration. Les migrations futures incrémenteront la version IndexedDB et resteront additives. Au premier démarrage, les événements et actions trouvés dans `releve-smur-operational-v1` sont copiés sans supprimer la clé d’origine.

L’outbox conserve chaque événement opérationnel avec un statut `pending`. L’adaptateur actuel est volontairement `local-only` : aucune synchronisation fictive n’est affichée comme réussie. Un futur adaptateur HTTP pourra traiter les événements de manière idempotente grâce à leurs identifiants et corrélations.

## Frontières futures

- authentification OIDC/annuaire et autorisations côté serveur ;
- API événementielle idempotente et résolution de conflits ;
- gestion de plusieurs établissements/unités/véhicules ;
- activation signée et historisée des versions de référentiel ;
- notifications serveur et tableaux de bord agrégés ;
- tests end-to-end sur navigateurs mobiles réels.
