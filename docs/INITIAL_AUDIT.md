# Audit initial du prototype

## Conservé

| Élément | Raison | Risque surveillé |
|---|---|---|
| Plan PNG réel | Source géographique validée et lisible | Désalignement des superpositions lors du zoom |
| Coordonnées en pourcentage | Adaptées au responsive | Validation visuelle nécessaire après modification |
| Idée événement/action/disponibilité | Bonne base du cycle opérationnel | Confusion initiale entre état, cause et action |
| Contrôle élément par élément | Réduit la perte lors d’une interruption | Cohérence de version pendant un contrôle long |
| Navigation mobile, safe areas, cibles tactiles | Base iPhone déjà solide | À valider avec texte agrandi et appareils réels |
| PWA statique | Déploiement simple et sans dépendance | Gestion des mises à jour et migrations |

## Remplacé

| Problème initial | Conséquence | Solution P0 | Risque de régression traité |
|---|---|---|---|
| État complet dans `localStorage` | Corruption, absence de transactions, structure figée | IndexedDB versionnée et repository atomique | Migration non destructive de la clé historique |
| Référentiel, fixtures et UI dans `app.js` | Couplage et données de démonstration prises pour du réel | Modules `data/domain/infrastructure/application/ui` | Tests d’unicité et badges de démonstration |
| Statuts saisis ou codés | Faux sentiment de disponibilité | Projection depuis anomalies et actions | Tests des cinq états opérationnels |
| Scénarios de carte prédéfinis | Déplacements sans action réelle | Groupement des actions par zone et ordre de proximité | Tests du parcours et point de départ manuel |
| « Vous êtes ici » fictif | Simulation trompeuse d’un GPS intérieur | « Point de départ sélectionné » | Aucune géolocalisation implicite |
| Péremptions/lots codés dans l’écran | Données obsolètes non modifiables | Lots persistants et remplacement avec nouveau lot | Sources historiques exclues, fixtures synthétiques |
| Recherche sur quelques valeurs | Localisation incomplète | 361 lignes SMUR + 357 lignes chariots | Limite d’affichage à 80 résultats pour les performances |
| Boutons modifiant seulement l’affichage | Perte après fermeture | Événement + outbox + transaction avant confirmation visuelle | Tests intégrés des transitions |

## Créé

- moteur événement → anomalie → action → correction → disponibilité ;
- compositions versionnées et arbre physique à `parentId` non limité ;
- workflows retour ciblé, contrôle, réarmement, péremption, défaut et passation ;
- utilisateurs/rôles de démonstration et matrice future ;
- politiques de conflits par type de donnée ;
- statistiques séparant usage normal, anomalie de conformité et défaillance ;
- documentation d’administration, sécurité, tests et priorités P0 à P3.

## Supprimé du produit publié

- scénarios statiques et position fictive ;
- données opérationnelles codées dans les vues ;
- photos de lots, signatures, identités et coordonnées de l’e-mail ;
- anciennes dates de péremption ;
- texte de dilution et procédure technique ancienne ;
- toute suggestion de dose, substitution ou conduite clinique.
