# Intégration du kit Chariots d’urgences — Box 3 et 4

Ce dossier contient un module React + TypeScript autonome, sans nouvelle
dépendance. Il utilise directement les trois assets exploitables du kit fourni.

Pour lancer ce kit seul avant de le copier :

```bash
npm install
npm run dev
```

## Ce qui fonctionne déjà

- choix du box 3 ou du box 4 ;
- vue du chariot de face ;
- cinq zones tactiles alignées sur les tiroirs ;
- ouverture du tiroir 1 sans compartiment ;
- sélection/désélection d’un matériel ;
- fiche compacte sous le tiroir, sans saut de scroll ;
- clavier, touche Échap, focus visible et réduction des animations ;
- partage des mêmes assets entre les box 3 et 4.

Le tiroir 1 contient désormais 19 éléments individualisés issus du kit confirmé.
Le filtre respiratoire et le raccord cannelé disposent chacun de leur propre
asset, position et zone tactile. Tous les matériels du tiroir 1 possèdent donc
un détourage visuel utilisable dans la vue interactive.

## Copie dans le projet

Copier exactement :

```text
public/assets/chariots/box-3-4-adulte/
src/features/emergency-carts/
```

Dans la page ou la route existante qui doit afficher les chariots :

```tsx
import { EmergencyCartsModule } from "./features/emergency-carts";

export default function ChariotsPage() {
  return <EmergencyCartsModule />;
}
```

Si cette page se trouve dans un sous-dossier, ajuster seulement le chemin de
l’import. Les chemins des images commencent par `/assets/` et ne doivent pas être
transformés en imports TypeScript.

## Exemple avec React Router

```tsx
import { Route } from "react-router-dom";
import { EmergencyCartsModule } from "./features/emergency-carts";

<Route
  path="/chariots/box-3-4-adulte"
  element={<EmergencyCartsModule />}
/>
```

Pour ouvrir directement le box 3 depuis une carte du menu :

```tsx
<Route
  path="/chariots/box-3-adulte"
  element={<EmergencyCartsModule initialBox={3} />}
/>
```

Pour reprendre la navigation de l’application :

```tsx
import { useNavigate } from "react-router-dom";
import { EmergencyCartsModule } from "./features/emergency-carts";

export default function ChariotsPage() {
  const navigate = useNavigate();
  return <EmergencyCartsModule onExit={() => navigate(-1)} />;
}
```

## Ajouter les futurs détourages

1. Placer le fichier dans :

```text
public/assets/chariots/box-3-4-adulte/items/
```

2. Ouvrir :

```text
src/features/emergency-carts/emergencyCartData.ts
```

3. Ajouter à l’objet concerné :

```ts
asset: "/assets/chariots/box-3-4-adulte/items/sonde-65.webp",
position: {
  x: 8,
  y: 18,
  width: 12,
  height: 42,
  rotation: 0,
  zIndex: 1,
},
```

Les valeurs sont des pourcentages par rapport au tiroir. Il faut les relever sur
la photo réelle du tiroir garni. Ne pas recopier l’exemple aveuglément.

## Ajouter un autre tiroir

Dans `emergencyCartData.ts`, compléter l’entrée du tiroir :

```ts
{
  id: "tiroir-02",
  label: "Tiroir 2 · Nom réel",
  category: "Catégorie réelle",
  topAsset: "/assets/chariots/box-3-4-adulte/tiroir-02-fond.webp",
  hitArea: { x: 26.5, y: 24.7, width: 47, height: 6.3 },
  items: [/* inventaire réel */],
  available: true,
}
```

Le code actuel construit les tiroirs 2 à 5 comme entrées provisoires. Remplacer
l’entrée générée par les données réelles lorsque les photos et inventaires sont
disponibles.

## Point à vérifier dans l’application existante

Si le projet utilise un `basename` ou est publié dans un sous-répertoire GitHub
Pages, les chemins `/assets/...` peuvent nécessiter le préfixe de base du projet.
Dans une PWA Vite déployée à la racine, aucun changement n’est nécessaire.
