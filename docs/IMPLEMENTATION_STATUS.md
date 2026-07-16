# État d’implémentation par priorité

## P0 — opérationnel local et vérifiable

Réalisé : architecture modulaire, référentiel sourcé, IndexedDB, migration, événements, outbox, disponibilité dérivée, retour d’intervention, contrôle atomique/reprise, réarmement par étapes, péremptions, défauts, carte dynamique, rôles préparatoires, PWA hors ligne, sécurité de base, tests et documentation.

À valider avant pilote : validation hospitalière de chaque composition, criticité des produits, emplacements exacts, matrice de responsabilités, tests visuels multi-appareils et procédure de reprise/sauvegarde locale.

## P1 — pilote connecté

- API d’événements idempotente et synchronisation bidirectionnelle ;
- authentification institutionnelle et autorisations réelles ;
- gestion validée des lots, codes-barres/QR et commandes ;
- activation/versionnement signé du référentiel ;
- notifications locales configurables ;
- export de rapports sans données patient.

## P2 — industrialisation

- multi-unités, véhicules et établissements ;
- règles de conflits et administration centrale ;
- tableaux de bord consolidés et objectifs de service ;
- intégrations pharmacie, biomédical et annuaire ;
- tests end-to-end CI sur navigateurs mobiles ;
- supervision, sauvegarde et plan de continuité.

## P3 — optimisation

- optimisation de tournées avec contraintes réelles ;
- analyses avancées de récurrence et de charge ;
- assistance de saisie par scan, sans recommandation clinique ;
- design system institutionnel et internationalisation éventuelle.

