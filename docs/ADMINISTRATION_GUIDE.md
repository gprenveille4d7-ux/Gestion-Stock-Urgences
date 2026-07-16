# Guide de configuration P0

Les opérations ci-dessous modifient un référentiel de démonstration dans le code. En production, elles devront passer par une interface d’administration, une validation et une activation historisée.

## Ajouter un sac ou contenant

1. Ajouter la source et son SHA-256 dans `src/data/source-manifest.js`.
2. Ajouter un `makeContainer(...)` dans `SMUR_CONTAINERS`, avec identifiant stable, type, couleur, source et `stockZoneId`.
3. Décrire les sections dans l’ordre physique et chaque ligne avec quantité, libellé et catégorie.
4. Vérifier que la composition générée reste `draft-to-validate`.
5. Ajouter/adapter les tests de nombre, d’unicité et de workflow.

Le tableau `REFERENCE_NODES` dérive automatiquement l’arbre service → zone → contenant → section → élément. Une profondeur supplémentaire se modélise avec un nœud possédant un `parentId` ; l’interface future ne doit pas imposer une profondeur maximale.

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
