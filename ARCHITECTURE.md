# Architecture métier — préparation opérationnelle SMUR

## Décision centrale

Le produit n'est pas un inventaire comptable. Sa responsabilité est de répondre à quatre questions :

- le matériel peut-il repartir ;
- une action est-elle nécessaire ;
- quelle action concrète reste à effectuer ;
- qui peut la reprendre et depuis quel point exact.

La disponibilité est donc **calculée**. Elle n'est jamais saisie directement comme un statut unique.

## Les six objets du modèle

### 1. Référentiel versionné

Décrit la composition officielle et l'ordre physique de contrôle. Une session retient `referenceId` et `referenceVersion` à son démarrage. Une activation ultérieure ne modifie jamais une session en cours.

### 2. Structure physique

Arbre récursif `contenant → sous-contenant → kit → élément`. La navigation suit le geste terrain et n'impose aucune profondeur arbitraire.

### 3. Événement

Fait daté et immuable : ouverture déclarée, défaillance signalée, contrôle commencé ou réarmement terminé. Un événement ne prouve pas à lui seul l'état physique actuel.

Champs minimaux préparés pour l'analyse future :

```text
id, type, family, subject, containerId, nodeId, quantity,
occurredAt, userId, context, source, referenceVersion
```

`family` sépare strictement :

- `usage` : consommation normale liée à une intervention ;
- `compliance` : écart constaté sans usage normal établi ;
- `failure` : défaut, casse ou test fonctionnel négatif.

### 4. Observation

Constat terrain daté : quantité présente, conformité d'un emballage, résultat d'un test. Chaque observation de contrôle est enregistrée immédiatement. L'état réel constaté prime toujours sur un mouvement théorique supposé.

### 5. Anomalie

Écart entre référentiel et observation. L'absence n'est qu'un motif parmi d'autres : mauvais calibre, souillure, scellé rompu, mauvais emplacement, surplus, péremption illisible ou défaut fonctionnel.

### 6. Action ouverte

Geste restant à accomplir : vérifier, ajouter, tester, remplacer ou reprendre un contrôle. L'action conserve sa source, sa gravité et son cycle de vie indépendamment de la disponibilité.

## Règles de transition

| Déclencheur | Constat | Action produite | Impact calculé |
| --- | --- | --- | --- |
| Kit déclaré ouvert | Contenu inconnu | Vérifier le kit | À vérifier |
| Vérification avec deux absences | 2 écarts confirmés | Ajouter les 2 éléments | À réarmer |
| Éléments replacés | Aucun écart restant | Action fermée | Prêt |
| Péremption à 28 jours | Produit encore valide | Remplacer avant échéance | Prêt avec action à prévoir |
| Défaillance fonctionnelle | Équipement inutilisable | Tester/remplacer | Indisponible |

Une couleur rouge d'anticipation n'implique donc pas automatiquement une indisponibilité.

## Contrôle atomique et interruption

Le contrôle n'est pas un formulaire long. Chaque geste écrit immédiatement :

```text
auditId + itemId + result + userId + timestamp + referenceVersion
```

La reprise est déduite du premier `itemId` sans observation dans l'ordre physique figé. Une passation future changera le responsable actif tout en conservant l'auteur de chaque micro-validation.

## Persistance hors ligne du prototype

Le prototype écrit l'état complet dans `localStorage` après chaque geste et le service worker met en cache l'interface. La cible de production remplacera cette implémentation par un journal IndexedDB transactionnel avec file de synchronisation idempotente.

Principes de synchronisation prévus :

- création locale avant toute tentative réseau ;
- identifiant client stable pour éviter les doublons ;
- événements append-only ;
- résolution explicite des conflits d'observations ;
- aucune migration silencieuse d'une session vers un nouveau référentiel.

## Statistiques et anticipation

Les statistiques sont des projections du journal, jamais une seconde source de vérité. Une alerte de couverture doit exposer ses facteurs : réserve actuelle, consommation récente et délai d'approvisionnement. Elle signale un risque ; elle ne commande rien et ne modifie jamais une dotation.

L'IA prédictive reste hors P0. Le schéma événementiel est néanmoins prêt à fournir plus tard un historique propre et explicable.

## Repère service

La mini-map est une projection spatiale des actions existantes. Elle ne possède aucune checklist métier autonome : les gestes « prendre » et « placer » lisent et modifient directement les lignes du réarmement ouvert. Les scénarios sans action liée restent explicitement en mode exploration.

Le parcours mémorise localement la zone courante, les micro-validations et l'affichage du trajet. La clôture d'un parcours de réarmement lié appelle le même moteur de conformité que l'écran de réarmement ciblé.

## Périmètre de ce prototype

Implémenté et testable :

- retour SMUR en quatre gestes ;
- moteur d'actions ouvertes ;
- contrôle exploratoire du Kit perfusion ;
- réarmement ciblé en deux temps ;
- contrôle bimestriel à reprise exacte ;
- séparation disponibilité / cause / gravité ;
- aperçu d'analyse explicable.
- repère spatial relié aux actions de réarmement.

Volontairement différé : stock de réserve réel, QR codes, authentification hospitalière, synchronisation serveur, passation multi-utilisateur et modèle prédictif entraîné.
