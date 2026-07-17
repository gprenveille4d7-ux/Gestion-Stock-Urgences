# Sécurité et confidentialité

## Mesures P0

- aucune donnée patient dans le modèle ou les fixtures ;
- signatures, identités, coordonnées de l’e-mail et photos de lots non publiées ;
- dates et lots historiques exclus ;
- instructions de dilution et procédure respirateur ancienne exclues ;
- contenu dynamique échappé avant insertion dans les vues ;
- politique CSP restrictive, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` ;
- styles en ligne limités aux coordonnées numériques générées des schémas, progressions et marqueurs ; les scripts en ligne restent interdits ;
- ressources PWA limitées à la même origine ;
- contrôles de chemin et en-têtes de sécurité dans le serveur local ;
- identifiants uniques, corrélations et journal append-only pour les faits métier ;
- migration de l’ancien stockage non destructive.

## Limites connues

IndexedDB n’est pas chiffré par l’application. Le poste et le profil navigateur doivent donc être protégés par les politiques de l’établissement. Le rôle local est un sélecteur de démonstration et non un mécanisme d’authentification. La CSP déclarée par balise doit être complétée par des en-têtes HTTP en production.

Il n’existe pas encore de serveur, de sauvegarde distante, de révocation, de signature de référentiel ni de journal central inviolable. L’application ne doit pas être déployée en production avant traitement de ces points, analyse de risques institutionnelle et validation DPO/RSSI.

## Préparation de la synchronisation

Le serveur futur doit authentifier chaque requête, vérifier les autorisations, traiter `eventId` de façon idempotente, conserver les versions de référence et refuser les transitions invalides. Les conflits ne doivent jamais être résolus par un simple « dernier écrit gagne » pour les observations ou disponibilités critiques.

