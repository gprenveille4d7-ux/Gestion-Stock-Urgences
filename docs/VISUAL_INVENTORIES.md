# Inventaires visuels - périmètre, complétude et édition sûre

## 1. Objet et règle de vérité

Ce document définit le périmètre des inventaires visuels et la manière de rendre les schémas de sacs et de réserves modifiables sans transformer une hypothèse graphique en donnée métier.

Le périmètre actuel couvre :

- 13 contenants issus de 13 PDF, soit 39 sections et 361 lignes de composition ;
- 3 chariots issus de classeurs de mars 2024, soit 18 sections (tiroirs, plateaux ou côtés) et 357 lignes historiques ;
- 3 vues provisoires de réserves : Réserve 1, Réserve SMUR et Réserve Respi.

Les nombres de lignes décrivent des enregistrements de référence. Ils ne représentent ni un nombre de produits uniques ni la quantité totale d'unités physiques.

Deux objets doivent toujours rester distincts :

1. La composition sourcée décrit ce qui est attendu : libellé source, quantité, unité, présentation, contenant, hiérarchie et document d'origine.
2. Le schéma visuel décrit où et comment l'élément est montré : image, face, poche, armoire, étagère, bac, coordonnées et navigation.

Une composition peut être correctement extraite alors que son schéma est encore provisoire. Inversement, un dessin plausible ne valide jamais une composition, une quantité ou un emplacement réel.

Règle absolue : aucune information absente ou ambiguë ne doit être complétée silencieusement. Une valeur inconnue reste nulle ou porte l'état « À CONFIRMER ». Une photo absente utilise « PHOTO À AJOUTER ». Un emplacement non validé utilise « EMPLACEMENT À CONFIRMER ».

## 2. Statuts employés

| Statut | Signification |
|---|---|
| Sourcé PDF | Donnée extraite d'un PDF identifié et empreinté, mais non encore validée par l'établissement |
| Historique XLSX | Donnée conservée comme référence historique uniquement, non activable comme vérité opérationnelle actuelle |
| Structuré | Hiérarchie technique présente dans les données |
| Provisoire | Hypothèse technique ou visuelle explicitement signalée et modifiable |
| Absent | Aucun élément fiable disponible dans le dépôt |
| À valider | Validation humaine obligatoire avant un pilote ou un usage réel |
| Validé | Validation institutionnelle datée, attribuée et versionnée |

Dans l'état actuel, aucune des 13 compositions PDF, aucun des 3 chariots historiques et aucun schéma de réserve ne possède le statut « Validé ».

## 3. Modèle de schéma modifiable

### 3.1 Version de schéma

Chaque schéma doit être une donnée indépendante du composant d'interface. Le composant générique ne contient aucune géométrie codée en dur pour un sac ou une réserve particulier.

Le module P0 `src/data/visual-schemas.js` expose actuellement :

| Champ | Rôle |
|---|---|
| id | Identifiant stable du schéma |
| entityId | Identifiant stable du sac, contenant, réserve, armoire ou autre noeud représenté |
| kind, label | Type et libellé du sujet représenté |
| viewKind | Vue fermée, ouverte, avant, arrière, gauche, droite, interne, pièce, armoire ou étagère |
| version | Version propre à la disposition visuelle |
| referenceSourceId | Source de référence liée, lorsqu'elle existe |
| status | Brouillon, à valider, validé, archivé |
| image | Source, texte alternatif et statut de la photo ou du placeholder |
| aspectRatio | Rapport largeur/hauteur de l'image de référence |
| layoutMode | Disposition explicite, grille fonctionnelle, index de sections ou rattachement de pièce connu |
| zones | Zones interactives de la vue |

La version de composition et la version de schéma évoluent séparément. Corriger une photo ou un tracé ne crée pas artificiellement une nouvelle composition. Modifier une quantité ou une hiérarchie ne réécrit pas silencieusement un schéma déjà utilisé.

Avant une activation institutionnelle, le modèle devra encore ajouter la traçabilité d'auteur, de validation et d'archivage ainsi que le lien vers la version exacte de composition. Ces champs futurs ne sont pas présentés comme déjà implémentés.

Le point d’extension `VISUAL_SCHEMA_DRAFTS` contient trois collections (`containers`, `chariots`, `reserves`). Un brouillon versionné peut remplacer l’image, les notes et la géométrie d’une ou plusieurs cibles stables. Les fonctions `getContainerDiagram`, `getChariotDiagram` et `getReserveDiagram` appliquent ces données sans changement du composant visuel. Elles conservent `parentVersion`, refusent une cible inconnue et rejettent toute zone hors du canevas. Un brouillon reste non physique ; le drapeau `physical` n’est accepté qu’avec une validation explicite de la zone, et le schéma complet ne devient `validated` que si toutes ses zones le sont. Pour une réserve, les niveaux armoire/étagère/bac sont éditables, tandis que la pièce `roomId` reste verrouillée sur le rattachement de référence.

Cette itération fournit donc le contrat et son test automatisé, pas encore une interface d’administration partagée. L’édition institutionnelle avec auteur, diff, approbation et activation reste le workflow futur décrit en section 7.

### 3.2 Zone interactive

Champs minimaux d'un hotspot :

| Champ | Rôle |
|---|---|
| id | Identifiant stable de la zone |
| targetId | Noeud physique ciblé dans le référentiel |
| label | Libellé visible |
| kind | Compartiment, kit, poche, tiroir, contenant ou équipement |
| x, y | Position en pourcentage de l'image de référence |
| w, h | Dimensions en pourcentage du rectangle |
| order | Ordre de lecture et de navigation |
| status | Statut du tracé ou de l'emplacement |
| itemCount | Nombre de lignes contenues, lorsque pertinent |
| location | Pour une réserve : pièce connue et niveaux armoire/étagère/bac encore nuls |

Les coordonnées sont relatives à l'image de référence, jamais à la taille de l'écran. Chaque valeur est comprise entre 0 et 100. Le moteur conserve le rapport d'aspect, recalcule l'affichage pour l'iPhone et vérifie qu'aucune zone ne sort du visuel.

Une géométrie éditée doit conserver au minimum 15 % de largeur. La hauteur minimale vaut 18 % sur les canevas `4 / 3` et 12 % sur les canevas verticaux `3 / 4`. Le rendu applique le minimum propre au diagramme et repositionne une zone trop proche d’un bord afin de préserver une cible tactile d’environ 44 px sur le canevas mobile de référence, sans agrandir ni superposer les index verticaux existants.

Le schéma ne stocke pas directement « prêt », « manquant » ou « indisponible ». Ces états sont projetés à l'affichage depuis les anomalies et actions ouvertes. Le statut visuel `validated` signifie seulement « implantation validée » et n’est jamais traduit en disponibilité du matériel. Une même géométrie reste ainsi réutilisable sans dupliquer l'état métier. Les polygones, la profondeur et les liens explicites vers un schéma enfant restent des extensions futures.

## 4. Matrice d'exhaustivité

### 4.1 Contenants issus des PDF

| Sac ou contenant | Composition | Hiérarchie | Photo | Schéma | Emplacement | Validation |
|---|---|---|---|---|---|---|
| Valise intra-osseuse | Sourcé PDF, 12 lignes | Groupe d’inventaire non physique | Absente | Placeholder fonctionnel généré | Réserve SMUR, affectation provisoire | Non, draft-to-validate |
| Sac vert n°1 - Pédia | Sourcé PDF, 105 lignes | Structuré, 11 sections | Absente | Grille fonctionnelle générée, non physique | Réserve SMUR, affectation provisoire | Non, draft-to-validate |
| Sac rouge n°1 - Solutés | Sourcé PDF, 81 lignes | Structuré, 10 sections | Absente | Grille fonctionnelle générée, non physique | Réserve SMUR, affectation provisoire | Non, draft-to-validate |
| Sac remplissage | Sourcé PDF, 6 lignes | Structuré, 1 section | Absente | Grille fonctionnelle générée, non physique | Réserve SMUR, affectation provisoire | Non, draft-to-validate |
| Sac plaies, sutures et épistaxis | Sourcé PDF, 21 lignes | Structuré, 3 sections | Absente | Grille fonctionnelle générée, non physique | Réserve SMUR, affectation provisoire | Non, draft-to-validate |
| Sac orange - Damage Control | Sourcé PDF, 21 lignes | Structuré, 1 section | Absente | Grille fonctionnelle générée, non physique | Réserve SMUR, affectation provisoire | Non, draft-to-validate |
| Sac noir - Mater | Sourcé PDF, 15 lignes | Structuré, 1 section | Absente | Grille fonctionnelle générée, non physique | Réserve SMUR, affectation provisoire | Non, draft-to-validate |
| Sac jaune - Fibrinolyse | Sourcé PDF, 20 lignes | Structuré, 1 section | Absente | Grille fonctionnelle générée, non physique | Réserve SMUR, affectation provisoire | Non, draft-to-validate |
| Sac bleu n°1 - Respi | Sourcé PDF, 45 lignes | Structuré, 6 sections | Absente | Grille fonctionnelle générée, non physique | Réserve Respi, affectation provisoire | Non, draft-to-validate |
| Réserve intubation - Sacoche bleue | Sourcé PDF, 19 lignes | Structuré, 1 section | Absente | Grille fonctionnelle générée, non physique | Réserve Respi, affectation provisoire | Non, draft-to-validate |
| Pochette anesthésiques et toxiques VRM | Sourcé PDF, 8 lignes | Structuré, 1 section | Absente | Grille fonctionnelle générée, non physique | Réserve SMUR, affectation provisoire | Non, draft-to-validate |
| Frigo médicaments | Sourcé PDF, 6 lignes | Structuré, 1 section | Absente | Grille fonctionnelle générée, non physique | PC IDE, affectation provisoire | Non, draft-to-validate |
| Kit sérum physiologique | Sourcé PDF, 2 lignes | Structuré, 1 section | Absente | Grille fonctionnelle générée, non physique | Réserve 1, affectation provisoire | Non, draft-to-validate |
| **Total PDF** | **361 lignes** | **39 sections** | **0 photo exploitable** | **0 schéma validé** | **Affectations à confirmer** | **13 validations requises** |

### 4.2 Chariots historiques

| Chariot | Composition | Hiérarchie | Photo | Schéma | Emplacement | Validation |
|---|---|---|---|---|---|---|
| Chariot d'urgence pédiatrique | Historique XLSX, 150 lignes | 5 tiroirs + 1 plateau/côté importés | Absente | Index visuel généré, non physique | Emplacement précis absent ; le champ scope vaut seulement « pédiatrie » | Non, historical-reference-only |
| Chariot d'urgence - Box 4 | Historique XLSX, 103 lignes | 5 tiroirs + 1 plateau/côté importés | Absente | Index visuel généré, non physique | Box 4 déduit du nom de la source, sans lien de zone validé | Non, historical-reference-only |
| Chariot d'urgence - Box 3 | Historique XLSX, 104 lignes | 5 tiroirs + 1 plateau/côté importés | Absente | Index visuel généré, non physique | Box 3 déduit du nom de la source, sans lien de zone validé | Non, historical-reference-only |
| **Total XLSX** | **357 lignes historiques** | **18 sections importées** | **0 photo exploitable** | **0 schéma validé** | **Liens physiques à confirmer** | **3 validations requises** |

Les lignes des chariots peuvent être recherchées et comparées. Elles ne doivent pas être présentées comme dotation actuelle tant que le service n'a pas confirmé qu'une version de mars 2024 est encore applicable.

### 4.3 Réserves à représenter

| Réserve | Composition | Hiérarchie | Photo | Schéma | Emplacement | Validation |
|---|---|---|---|---|---|---|
| Réserve 1 | Partielle : un kit sérum physiologique affecté, 2 lignes ; inventaire de réserve complet absent | Zone seulement ; armoires, étagères et bacs absents | Absente | Index des rattachements connus, non physique | Zone repérée sur le plan près du Box 4 ; superposition à vérifier | Non |
| Réserve SMUR | Partielle : 9 contenants PDF affectés, 289 lignes ; stock de réarmement de la réserve absent | Zone seulement ; armoires, étagères et bacs absents | Absente | Index des rattachements connus, non physique | Zone repérée sur le plan ; superposition à vérifier | Non |
| Réserve Respi | Partielle : 2 contenants PDF affectés, 64 lignes ; stock de réarmement de la réserve absent | Zone seulement ; armoires, étagères et bacs absents | Absente | Index des rattachements connus, non physique | Zone repérée sur le plan ; superposition à vérifier | Non |

Une affectation de sac à une réserve ne constitue pas l'inventaire du stock de réarmement de cette réserve. Les produits disponibles pour remplir les sacs doivent posséder leurs propres quantités et emplacements physiques.

Les `stockZoneId` actuels sont des rattachements proposés avec le statut `provisional-to-validate`. Ils alimentent uniquement les index visuels de réserves et ne sont pas utilisés comme destinations opérationnelles. Le noeud du contenant reste rattaché au service, avec un `proposedParentId`, jusqu’à validation humaine de sa zone réelle.

De même, une action n’entre dans un parcours que si `targetZoneStatus` ou `finalZoneStatus` vaut explicitement `validated`. Les anciens identifiants sans statut et les fixtures de démonstration sont ignorés par le planificateur. Collecte, remise en place et clôture restent bloquées tant que l’emplacement requis n’est pas validé.

## 5. Constat exact du PDF actif - Valise intra-osseuse

### 5.1 Identité vérifiée

- Fichier : valises_intra_osseuses.pdf
- Référence visible : URG.ENR.053
- Révision : V1
- Date : Mars 2024
- Nombre de pages : 2
- SHA-256 vérifié : 25BBB0FB1BFB6022B1983193E1FC4724D20D8520E661EC649A57E5AC252683BB
- Concordance : l'empreinte du fichier actif correspond exactement à celle de source-manifest.js.

La première page est une couverture institutionnelle. Elle ne contient pas de photo exploitable de la valise. La seconde page est une liste à puces sans photo, schéma, face, poche, compartiment ni emplacement interne.

### 5.2 Transcription littérale des 12 lignes

La casse est normalisée ici pour la lecture, mais les nombres et unités restent ceux visibles dans le PDF :

1. 1 x PERCEUSE
2. 2 x INTRA OSSEUX JAUNES 45mm / 45GA AVEC KIT DE FIXATIONS
3. 2 x INTRA OSSEUX ROSES 15mm / 15GA AVEC KIT DE FIXATIONS
4. 2 x INTRA OSSEUX BLEUS 25mm / 15GA AVEC KIT DE FIXATIONS
5. 4 x TEGADERMS
6. 1 x TUBULURES 3 VOIES
7. 2 x SERINGUES PRE-REMPLIES
8. 1 x SERUM PHY 50 ML
9. 2 x PAQUETS DE 5 COMPRESSES STERILES
10. 1 x BISEPTINE
11. 2 x BANDES EXTENSIBLES 7 CM * 3M
12. 1 x SERINGUE DE 50 LUER LOCK.

### 5.3 Ambiguïtés et écarts à ne pas corriger silencieusement

| Constat | Risque | Traitement sûr |
|---|---|---|
| Le PDF porte littéralement « 45mm / 45GA » pour les intra-osseux jaunes | « 45GA » peut être une valeur voulue ou une erreur documentaire ; le dépôt ne permet pas de trancher | La valeur est conservée dans `sourceText` et signalée « calibre source à confirmer » ; une validation humaine reste obligatoire |
| Les lignes roses et bleues portent « 15GA » | Un normaliseur futur pourrait perdre cette caractéristique source | Les valeurs sont désormais conservées dans `sourceText` et le libellé visible ; ajouter ultérieurement `longueurMm` et `gaugeSource` séparés après validation |
| Le référentiel actuel ajoute le mot « Aiguille » à « INTRA OSSEUX » | Expansion sémantique plausible mais non littérale | Conserver libellé brut et libellé normalisé avec justification de transformation |
| « SERINGUE DE 50 LUER LOCK » ne donne aucune unité après 50 | Une interprétation en mL serait une invention | Le libellé applicatif signale désormais « unité source absente » et conserve `sourceText` ; structurer `volumeValue = 50`, `volumeUnit = null` et `dataQuality = ambiguous` après évolution du modèle |
| « SERINGUES PRE-REMPLIES » ne précise ni contenu, ni volume, ni présentation | Impossible de dédupliquer correctement le produit ou de guider un réarmement précis | Conserver le libellé brut, sans contenu ni volume inventé, et bloquer l'activation de cette ligne |
| « BISEPTINE » ne précise ni volume ni présentation | Risque de sélectionner une mauvaise présentation lors du réarmement | Présentation nulle, badge « À CONFIRMER », validation pharmacie ou référent matériel |
| « TEGADERMS » ne précise pas le format | Plusieurs formats peuvent exister | Ne pas ajouter de dimension ; validation du format attendu |
| « 2 x PAQUETS DE 5 COMPRESSES » exprime 2 paquets, et non 2 compresses | Une conversion silencieuse pourrait fausser la quantité attendue | expectedQuantity = 2 et unit = paquet ; packSize = 5 seulement si le modèle le distingue explicitement |
| La perceuse ne possède ni modèle, ni référence, ni identifiant de parc dans le PDF | Impossible de relier sans ambiguïté le consommable à un équipement réutilisable précis | Conserver une ligne équipement générique ; compléter l'asset seulement depuis une source biomédicale validée |
| Aucun emplacement interne n'est donné | Un schéma de compartiment réaliste ne peut pas être déduit de la liste | Utiliser un placeholder sans hotspots physiques jusqu'à fourniture de photos ou d'un relevé validé |

Le texte source fait autorité sur la transcription. Une correction jugée évidente reste une correction humaine et doit produire une nouvelle version, une justification et une trace de validation.

## 6. Données manquantes ou à valider

| ID | Information manquante ou à valider | Module concerné | Impact | Bloquant | Hypothèse temporaire autorisée | Validation humaine nécessaire |
|---|---|---|---|---|---|---|
| VIS-01 | Photo de chaque contenant fermé | Fiches matériel | Reconnaissance visuelle limitée | Non pour prototype ; oui pour expérience cible | Silhouette colorée et « PHOTO À AJOUTER » | Référent matériel |
| VIS-02 | Photos ouvertes, faces, poches, kits et sous-kits | Schémas de sacs | Hotspots physiques impossibles à positionner fidèlement | Oui pour un schéma déclaré fidèle | Vue générique sans prétention de fidélité | IDE référent et logisticien |
| VIS-03 | Photos générales des trois réserves | Schémas de réserves | Repérage de la pièce impossible | Non pour le squelette ; oui pour validation terrain | Placeholder de pièce | Référent logistique |
| VIS-04 | Numérotation réelle des armoires, étagères et bacs | Réserves et recherche | Impossible d'indiquer un emplacement actionnable | Oui pour recherche et réarmement de production | « EMPLACEMENT À CONFIRMER », sans numéro inventé | Référent logistique |
| DATA-01 | Inventaire réel du stock de réarmement des trois réserves | Recherche, actions, parcours | Origine de collecte inconnue | Oui pour le parcours réel | Ne montrer que les affectations connues, clairement distinctes du stock | Pharmacie et référent matériel |
| DATA-02 | Emplacement exact de chaque produit de réserve | Recherche et parcours | Trajets et repères incomplets | Oui pour le test Réserve KT 22G | Aucun bac fictif ; étape bloquée « emplacement à confirmer » | Référent logistique |
| DATA-03 | Validation des 13 compositions PDF et de leurs 361 lignes | Référentiel et contrôles | Faux sentiment de conformité | Oui avant pilote | Conserver le badge démonstration / à valider | Responsables habilités |
| DATA-04 | Actualité des trois inventaires de chariots de mars 2024 | Chariots | Risque de présenter une dotation obsolète | Oui avant usage opérationnel | Recherche historique seulement | Référent matériel et pharmacie |
| DATA-05 | Emplacement du chariot pédiatrique | Carte et recherche | Destination non fiable | Oui pour un trajet | Aucun emplacement déduit du seul scope « pédiatrie » | Référent matériel |
| DATA-06 | Liens de zone structurés et validés pour les chariots Box 3 et Box 4 | Carte et recherche | Le nom du fichier est la seule indication actuelle | Oui pour activation | Afficher « Box déduit du document, à confirmer » | Référent matériel |
| IO-01 | Confirmation de « 45GA » | Composition IO | Calibre potentiellement erroné ou atypique | Oui pour cette ligne | Valeur brute visible, valeur normalisée nulle | Référent matériel ou biomédical |
| IO-02 | Unité du « 50 » de la seringue Luer Lock | Composition IO | Produit mal identifié si mL est supposé | Oui pour cette ligne | Valeur 50, unité nulle | Référent matériel |
| IO-03 | Contenu et volume des seringues pré-remplies | Composition IO | Déduplication et réarmement ciblé impossibles | Oui pour cette ligne | Libellé brut seulement | Référent matériel ou pharmacie |
| IO-04 | Formats de Biseptine et Tegaderm | Composition IO | Présentation de collecte non déterminée | Nécessaire avant production | Présentation nulle | Pharmacie ou référent matériel |
| LOC-01 | Emplacement exact des sacs dans Réserve SMUR et Réserve Respi | Schémas et parcours | Destination finale insuffisamment précise | Oui pour un guidage complet | Niveau réserve seulement, marqué provisoire | Référent logistique |
| GOV-01 | Responsables autorisés à proposer, valider et activer une version | Administration | Gouvernance et traçabilité incomplètes | Oui avant édition partagée | Brouillons locaux non activables | Direction / responsables désignés |

Un manque purement visuel ne bloque pas la construction du composant générique. Il bloque en revanche toute affirmation de fidélité et doit rester visible dans l'interface et le rapport de validation.

## 7. Workflow futur d'édition sûre

1. Sélectionner une entité et la dernière version validée.
2. Dupliquer cette version dans un brouillon. Une version validée reste immuable.
3. Choisir explicitement le type de modification : composition, hiérarchie, emplacement ou schéma visuel.
4. Conserver pour chaque ligne le libellé brut, le document, la page ou la cellule source et l'empreinte du fichier.
5. Enregistrer chaque normalisation séparément avec son motif. Une valeur absente reste nulle.
6. Pour un schéma, choisir une photo réelle, un schéma dérivé, une silhouette ou un placeholder et enregistrer ce niveau de preuve.
7. Positionner les hotspots en pourcentage et les relier à des targetNodeId stables.
8. Refuser l'enregistrement si un hotspot sort de l'image, cible un noeud absent, duplique un identifiant ou crée une boucle de navigation.
9. Prévisualiser sur iPhone étroit, iPhone standard, texte agrandi et mode hors ligne.
10. Produire un diff lisible : lignes ajoutées, supprimées ou modifiées ; déplacements de zones ; image remplacée ; ambiguïtés résolues ou créées.
11. Faire valider la composition par les responsables métier compétents et le schéma par une personne connaissant physiquement le rangement.
12. Activer une nouvelle version datée et signée. Conserver la précédente pour les contrôles déjà commencés.
13. Incrémenter les versions de référentiel et de cache nécessaires. Ne migrer automatiquement que les usages futurs compatibles.
14. Permettre le retour à la version précédente sans supprimer les événements, contrôles, observations ou actions historiques.

### Garde-fous de publication

Une version ne peut pas passer à « Validé » si :

- une ligne active possède une unité requise mais inconnue ;
- une ambiguïté bloquante reste sans décision humaine ;
- un hotspot cible un noeud supprimé ;
- une image provisoire est présentée comme photo réelle ;
- une donnée historique est présentée comme dotation actuelle ;
- un emplacement déduit est affiché comme emplacement confirmé ;
- le nom du validateur, la date ou la source manque.

La résolution d'une ambiguïté ne remplace jamais la valeur brute. Par exemple, si « 45GA » est ultérieurement corrigé, la version publiée conserve le texte source, la valeur normalisée validée, le motif, l'auteur et la date de la décision.

## 8. Critères de couverture

L'intégration des inventaires visuels est considérée comme complète techniquement lorsque :

- les 13 contenants PDF et les 3 chariots sont accessibles comme inventaires de premier niveau, et pas seulement par une recherche textuelle ;
- leur statut de source et de validation est visible ;
- les trois réserves disposent chacune d'une vue, même si un placeholder explicite est nécessaire ;
- toutes les vues utilisent le même composant piloté par les données ;
- les versions de composition et de schéma sont indépendantes et historisées ;
- chaque hotspot utilise des coordonnées en pourcentage et une cible stable ;
- les lignes historiques ne peuvent pas être activées sans validation ;
- aucun visuel, calibre, unité, quantité, présentation ou emplacement n'est inventé silencieusement.
