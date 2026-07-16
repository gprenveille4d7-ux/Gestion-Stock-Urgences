# Stratégie de tests

## Automatisé P0

`tests/domain.test.mjs` couvre :

- unicité et traçabilité des 361 éléments SMUR ;
- calcul de disponibilité ;
- création d’anomalie/action depuis une observation ;
- limites des horizons de péremption ;
- groupement et ordre du parcours ;
- statistiques issues du journal ;
- 357 lignes XLSX et exclusion des champs sensibles/obsolètes ;
- transaction intégrée observation → événement → anomalie → action → outbox ;
- cycle complet réarmement → étapes journalisées → résolution de l’anomalie ;
- retour ciblé, contrôle figé au niveau du kit, pause/reprise/passation ;
- remplacement de péremption avec nouveau lot actif ;
- politique de conflits et adaptateur local sans faux envoi ;
- rendu des 13 routes P0 avec état opérationnel et formulaire de retour ciblé.

Commande : `npm test` avec Node.js 20 ou plus.

## Contrôles statiques réalisés

- chargement de tous les modules ;
- rendu des 13 routes avec un état opérationnel ;
- absence de valeurs `undefined`/`NaN` dans les vues ;
- parsing du manifeste et du service worker ;
- réponse HTTP 200 des 31 ressources précachées ;
- recherche de contenu clinique exclu et de données personnelles dans les données publiées.

## Matrice manuelle avant pilote

- iPhone Safari, Android Chrome et tablette paysage ;
- installation PWA puis redémarrage sans réseau ;
- interruption d’un contrôle, fermeture du navigateur et reprise ;
- deux onglets et mise à jour croisée ;
- lecteur d’écran, zoom 200 %, clavier et contraste ;
- quota IndexedDB, mise à jour du service worker et migration depuis la version 0.4.0 ;
- validation métier de chaque composition et de chaque emplacement cartographique.

Le navigateur interactif automatisé n’était pas disponible pendant cette itération ; cette matrice reste donc une condition du pilote.
