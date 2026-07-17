# Guide de configuration P0

Les opérations ci-dessous modifient un référentiel de démonstration dans le code. En production, elles devront passer par une interface d’administration, une validation et une activation historisée.

## Ajouter un sac ou contenant

1. Ajouter la source et son SHA-256 dans `src/data/source-manifest.js`.
2. Ajouter un `makeContainer(...)` dans `SMUR_CONTAINERS`, avec identifiant stable, type, couleur, source, `stockZoneId` proposé et `stockZoneStatus`. Laisser ce dernier à `provisional-to-validate` tant que le rattachement n’est pas confirmé sur place.
3. Décrire les sections dans l’ordre physique et chaque ligne avec quantité, libellé et catégorie.
4. Vérifier que la composition générée reste `draft-to-validate`.
5. Ajouter/adapter les tests de nombre, d’unicité et de workflow.

Le tableau `REFERENCE_NODES` dérive automatiquement l’arbre service → zone → contenant → section → élément. Une profondeur supplémentaire se modélise avec un nœud possédant un `parentId` ; l’interface future ne doit pas imposer une profondeur maximale.

## Modifier un schéma de sac, de chariot ou de réserve

Les vues utilisent le composant générique `src/ui/visual-schema.js`. Aucune géométrie propre à un sac ne doit être ajoutée dans ce composant.

Les brouillons sont des données. `VISUAL_SCHEMA_DRAFTS` fournit les trois collections `containers`, `chariots` et `reserves`. Une entrée peut être ajoutée dans cette table ou chargée plus tard depuis IndexedDB/API, puis passée à `getContainerDiagram`, `getChariotDiagram` ou `getReserveDiagram`. Le composant d’écran reste inchangé.

```js
{
  version: 'schema-local-2',
  status: 'draft-to-validate',
  image: {
    src: 'assets/photos/sac-vert-pedia-ouvert.webp',
    alt: 'Sac vert Pédia ouvert'
  },
  zones: {
    'sac-vert-pedia:ampoulier': {
      x: 8, y: 7, w: 24, h: 20,
      status: 'draft-to-validate',
      physical: false
    }
  }
}
```

L’application conserve automatiquement la version parente, refuse une cible inconnue et bloque toute coordonnée qui sort du canevas. `physical: true` n’est accepté qu’avec un statut de zone `validated` ; ce statut doit être attribué après la validation humaine prévue par l’établissement. Le schéma complet ne devient `validated` que lorsque chacune de ses zones l’est aussi. Dans une réserve, un brouillon peut renseigner `cabinet`, `shelf` et `bin`, mais ne peut jamais déplacer une cible vers un autre `roomId` : ce changement exige un nouveau rattachement de référence validé.

1. Modifier la donnée dans `src/data/visual-schemas.js`.
2. Conserver des coordonnées `x`, `y`, `w` et `h` en pourcentage, comprises dans le canevas.
3. Cibler un identifiant stable de section, tiroir, contenant ou équipement avec `targetId`.
4. Ne créer une disposition explicite que depuis une photo, un schéma ou des libellés suffisamment précis. Sinon, conserver la grille générée et le statut `generated-to-validate`.
5. Laisser `image.src` à `null` tant qu’aucune vraie photo validée n’est disponible : l’interface affichera `PHOTO À AJOUTER`.
   Toute photo ajoutée au dépôt doit aussi être ajoutée à `CORE_ASSETS` dans `sw.js` avant le pilote hors ligne.
6. Pour une réserve, ne renseigner `cabinet`, `shelf` ou `bin` qu’après relevé humain. Une valeur absente reste `null` et `missing-to-validate`.
7. Incrémenter `VISUAL_SCHEMA_VERSION`, le cache du service worker et ajouter un test de couverture.

Les 13 contenants et les 3 chariots reçoivent automatiquement un schéma, y compris lorsqu’aucune disposition spécifique n’est définie. Les trois réserves dérivent seulement les contenants et équipements déjà rattachés à leur zone ; cette dérivation ne valide pas leur position dans la pièce.

## Ajouter une zone ou modifier une coordonnée

Modifier `SERVICE_ZONES` dans `src/data/reference.js` : `id`, libellé, description, coordonnées `x`/`y` en pourcentage et tonalité. Les coordonnées doivent être vérifiées visuellement sur `assets/plan-urgences-falaise.png`. Mettre ensuite à jour les tests de parcours.

## Créer une nouvelle version de composition

1. Ne jamais modifier silencieusement une version active.
2. Ajouter une nouvelle entrée source avec sa révision, sa date et son empreinte.
3. Créer une nouvelle composition avec un identifiant/version distinct.
4. Conserver l’ancienne composition pour les contrôles déjà démarrés.
5. Renseigner date d’application, modifications et validateur uniquement après validation institutionnelle.
6. Incrémenter la version du référentiel dans `src/config.js` et le nom du cache dans `sw.js`.

## Ajouter un utilisateur de démonstration

Ajouter un enregistrement sans donnée réelle dans `users` de `src/data/demo-fixtures.js` : identifiant, nom d’affichage, rôle, état actif, compteur et dernière attribution. En production, les utilisateurs proviendront de l’annuaire authentifié et ne devront pas être codés dans le dépôt.

## Configurer les horizons de péremption

Modifier `EXPIRY_HORIZONS` dans `src/config.js`. Les valeurs sont des jours d’affichage et de planification ; elles ne changent pas la disponibilité clinique automatiquement. Ajouter un test de frontière dans `tests/domain.test.mjs`.

## Régénérer les chariots XLSX

Exécuter :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\extract-xlsx-reference.ps1
```

Contrôler ensuite le nombre de lignes et l’absence de signatures, identités, anciennes péremptions et instructions.

## Checklist après toute modification

1. `npm test` ;
2. démarrage via `serve.ps1` ;
3. vérification mobile et hors ligne ;
4. contrôle des  ressources listées dans `CORE_ASSETS` ;
5. incrément du cache si un fichier précaché change ;
6. mise à jour de la documentation de provenance.
