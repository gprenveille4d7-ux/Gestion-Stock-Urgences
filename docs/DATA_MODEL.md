# Modèle de données

## Référentiel

### SourceDocument

- `id`, `fileName`, `sha256` ;
- `documentRef`, `revision`, `sourceDate` lorsque connus ;
- `status` : `draft-to-validate`, `historical-reference-only` ou `historical-context-only` ;
- motif d’exclusion éventuel.

### Container / Section / ReferenceItem

Un contenant possède un emplacement de stockage, une source et plusieurs sections physiques. Un élément de référence possède une quantité attendue, une unité, une catégorie, un indicateur de suivi de péremption et un champ de criticité. La criticité importée est volontairement `non_evaluee` : elle doit être définie par les responsables habilités.

Les identifiants des 361 éléments SMUR sont stables dans une version de référence. Les 357 lignes de chariots portent également la cellule source du classeur.

Les types de contenants sont extensibles : sac, valise, pochette, kit, armoire, chariot, tiroir, plateau et compartiment. Une ligne de composition référence un `Product` dédupliqué ; ce produit porte catégorie, suivi de péremption et criticité à valider.

### Zone et Asset

Une `Zone` décrit un emplacement cartographique ou logique : PC IDE, box, réserve ou garage. Un `Asset` décrit un véhicule, un équipement ou un dispositif réutilisable, son emplacement d’attache et ses attributs de parc. Trois assets synthétiques démontrent le modèle sans publier d’immatriculation ni de numéro de série réel.

## Opérationnel

### Event

Fait immuable : `id`, `type`, `subject`, `at`, `userId`, `userRole`, `deviceId`, `correlationId`, `referenceVersion`, `payload`.

Types P0 : début/fin de contrôle, observation, déclaration d’usage, défaut, planification de péremption, modification de ligne/étape et clôture d’action.

### Audit et Observation

`Audit` fige la liste des identifiants à contrôler et la version du référentiel. Une `Observation` est adressée par `auditId + itemId`, contient résultat, quantités attendue/observée, note, niveau choisi, date et utilisateur. Une nouvelle saisie remplace la projection de l’observation mais ajoute toujours un événement au journal.

### Anomaly

- type : manquant, quantité incorrecte, périmé, défectueux, défaut fonctionnel ou contrôle requis ;
- sujet : contenant ou élément ;
- gravité : attention ou bloquant ;
- statut : ouvert ou résolu ;
- événement d’origine et événement de résolution.

### Action

- type : réarmement, contrôle, remplacement de péremption, traitement de défaut, remise en place ;
- priorité, statut, étape de workflow ;
- contenant et zone cible ;
- lignes quantité/élément ;
- anomalie, lot et événements associés.

### Lot

`itemId`, numéro de lot, date de péremption, quantité, statut. Les lots livrés sont synthétiques et clairement marqués. Les dates historiques des fichiers ne sont pas importées.

### Outbox

`id`, `eventId`, `status`, `attempts`, `createdAt`. La PWA P0 garde les entrées en attente tant qu’aucun serveur n’est configuré.

### User et Role

Le profil local expose `id`, nom d’affichage, rôle et mode d’authentification. Les rôles préparés sont soignant, référent, pharmacie, biomédical et administrateur. P0 ne les applique pas comme barrière de sécurité.

## Disponibilité dérivée

- anomalie ouverte bloquante → `indisponible` ;
- contrôle requis ou défaut non bloquant → `a_verifier` ;
- usage, manquant, quantité incorrecte ou réarmement ouvert → `a_rearmer` ;
- remplacement de péremption seulement → `pret_avec_action_a_anticiper` ;
- aucun écart/action ouvert → `pret` ;
- contenant absent du référentiel → `inconnu`.

Une péremption prochaine ne rend donc pas automatiquement un sac indisponible.

## Politiques de conflit préparées

- événement : ajout immuable et déduplication par identifiant ;
- référentiel : coexistence par version, conflit visible si une même version diffère ;
- action clôturée deux fois : fusion contrôlée des événements de clôture ;
- observation ou péremption divergente : revue manuelle obligatoire ;
- commentaire : conservation des deux versions.

Il n’existe pas de règle globale « dernière écriture gagnante ».
