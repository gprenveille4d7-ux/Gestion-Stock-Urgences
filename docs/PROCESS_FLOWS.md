# Processus métier P0

## Retour d’intervention

1. L’utilisateur choisit le contenant puis, si connu, le kit et l’élément précis ; le parent est déduit.
2. Un kit simplement ouvert produit `USAGE_DECLARED`, une anomalie `controle_requis` et un contrôle limité à ce kit.
3. Un élément connu comme utilisé ou manquant produit directement une action de réarmement ciblée, sans contrôle complet imposé.
4. Le contrôle reprend le référentiel versionné du contenant ou du kit.
5. Chaque écart génère immédiatement une anomalie et une action ciblée.
6. La clôture du contrôle résout l’anomalie de contrôle, mais pas les écarts matériels.
7. Les actions matérielles suivent collecte → vérification → remise en place → clôture.

## Contrôle périodique

Le contrôle peut être interrompu. Chaque observation est atomique et le premier élément non renseigné est proposé à la reprise. La pause, la reprise et la passation à un autre profil sont journalisées avec la dernière position. La clôture est refusée tant qu’un élément prévu ne possède pas d’observation.

Résultats disponibles : conforme, manquant, quantité incorrecte, périmé, défectueux, non applicable. Le caractère bloquant est un choix explicite de l’utilisateur ; l’application ne l’infère pas cliniquement.

## Réarmement

Une action contient ses lignes réelles. Toutes doivent être confirmées avant de passer à la vérification. Les changements d’étape et de ligne produisent des événements. La clôture résout l’anomalie d’origine et recalcule la disponibilité.

## Péremptions

Les lots sont filtrés par horizons 30/60/90/180 jours. Une planification crée une action de remplacement. La clôture exige le nouveau lot, sa quantité et sa péremption mois/année ; elle active ce lot et historise l’ancien comme remplacé. Aucun conseil de substitution n’est fourni.

## Défaut fonctionnel

Le formulaire ne demande qu’un constat, un élément facultatif et le caractère bloquant. Il crée `DEFECT_REPORTED`, une anomalie et une action. Aucune procédure de réparation ou d’usage clinique n’est affichée.

## Parcours terrain

Les actions ouvertes sont regroupées par zone. Un algorithme glouton de proximité ordonne les étapes depuis le point de départ choisi. Le marqueur ne prétend pas géolocaliser l’utilisateur.
