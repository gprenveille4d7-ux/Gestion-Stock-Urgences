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
- repli en mémoire temporaire lorsque l’ouverture IndexedDB échoue, sans masquer le mode dégradé.

`tests/visual-schemas.test.mjs` couvre :

- un hotspot borné et unique pour chaque section des 13 contenants ;
- schémas complets des 3 chariots et dérivation prudente des 3 réserves ;
- remplacement versionné d’une photo et de coordonnées sans modifier le composant ;
- refus d’une cible inconnue ou d’une géométrie hors limites ;
- impossibilité de marquer un brouillon comme emplacement physique validé.

`tests/ui.test.mjs` couvre :

- rendu des 17 routes P0 avec état opérationnel et formulaire de retour ciblé ;
- parcours exhaustif des 13 fiches, 39 sections, 3 chariots, 18 tiroirs, plateaux ou côtés et 3 réserves ;
- conservation des 361 lignes PDF et 357 lignes XLSX dans leurs vues détaillées ;
- état explicite lorsque le référentiel des chariots est indisponible.

Commande : `npm test` avec Node.js 20 ou plus.

## Contrôles statiques réalisés

- chargement de tous les modules ;
- rendu des routes générales et de chaque sous-inventaire avec un état opérationnel ;
- absence de valeurs `undefined`/`NaN` dans les vues ;
- parsing du manifeste et du service worker ;
- réponse HTTP 200 des 34 ressources précachées ;
- repli sur le cache après délai réseau, erreur réseau ou réponse HTTP non saine ;
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
