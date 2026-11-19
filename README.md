# Portfolio de Vincent Douin

Site vitrine de Vincent Douin, monteur vidéo et motion designer : une page d'accueil (portrait, nom, phrase d'accroche, vidéos, contact) et une page de mentions légales.

Astro, TypeScript, CSS natif (pas de framework CSS ni de framework d'interface). Les pages sont générées en HTML statique ; le seul JavaScript envoyé au navigateur fait environ 2 ko et gère les aperçus vidéo, le lecteur et l'apparition au scroll. Le contenu reste lisible sans JavaScript, par les moteurs de recherche et par les robots IA.

## Démarrer

Tout passe par le flake Nix, qui fournit Node et ffmpeg, et coupe la télémétrie d'Astro :

```sh
nix develop --command npm install
nix develop --command npm run dev      # serveur de développement
nix develop --command npm run check    # vérification des types
nix develop --command npm run build    # check + site statique dans dist/
nix develop --command npm test         # vérifie le contenu de dist/
nix develop --command npm run preview  # sert dist/ en local
```

`nix build` produit le même site dans result/, hors ligne, à partir de package-lock.json.

Pour un build de production, donner l'adresse publique du site, sans quoi les liens canoniques et le sitemap ne sont pas écrits. Si elle contient un chemin (`https://soywod.github.io/vincent`), tous les liens du site le prennent en préfixe :

```sh
SITE_URL=https://exemple.fr nix develop --command npm run build
```

## Ajouter ou remplacer des vidéos

1. Mettre les fichiers sources (`.mp4`, `.mov`, `.m4v`) dans un dossier, hors du dépôt. Le nom du fichier, sans son extension, est le titre affiché sur le site (`Trailer podcast.mp4` donne « Trailer podcast »).
2. Lancer l'encodage :

   ```sh
   nix develop --command npm run encode -- /chemin/vers/le/dossier
   ```

   Pour chaque vidéo, le script écrit dans public/media/ une miniature (AVIF et JPEG), un aperçu muet de 6 secondes en 720p et la vidéo complète, puis régénère src/data/media.json. Les fichiers déjà à jour ne sont pas refaits.
3. Déposer les vidéos complètes dans le bucket (section suivante).

Les vidéos sont classées de la plus récente à la plus ancienne, d'après la date inscrite dans le fichier par la caméra ou le logiciel de montage (à défaut, sa date de modification). Les vidéos verticales (plus hautes que larges) vont dans « Format réel », un carrousel qui défile tout seul quand elles débordent de la largeur ; les autres vont dans la grille « Format réseau ».

Par défaut la vidéo complète n'est pas recompressée : si elle est déjà lisible par un navigateur (H.264 4:2:0, audio AAC), elle est seulement réorganisée pour démarrer sans attendre la fin du téléchargement. Pour des fichiers plus légers, `FULL_CRF=20` force une recompression en 1080p :

```sh
FULL_CRF=20 nix develop --command npm run encode -- /chemin/vers/le/dossier
```

Les vidéos complètes (public/media/\*/full.mp4) sont ignorées par Git : trop lourdes pour un dépôt, elles se régénèrent depuis les sources.

## Vidéos complètes sur un bucket (Cloudflare R2)

En production, les vidéos complètes ne sont pas servies par le site mais par un bucket public. Les miniatures et les aperçus, eux, restent dans le dépôt et sur le site.

1. Déposer chaque vidéo complète à la racine du bucket, sous le nom inscrit en `remote` dans src/data/media.json. Pour un fichier déjà prêt pour le web (MP4 H.264/AAC qui démarre sans attendre la fin du téléchargement), c'est le fichier source lui-même, sans le renommer. Sinon, le script d'encodage indique quel fichier déposer et sous quel nom.
2. Donner l'adresse publique du bucket au build :

   ```sh
   PUBLIC_MEDIA_URL=https://media.exemple.fr SITE_URL=https://exemple.fr nix develop --command npm run build
   ```

   Sur GitHub Pages, les deux variables sont dans .github/workflows/pages.yml. En local, elles peuvent aussi aller dans un fichier .env (ignoré par Git).

Avec `PUBLIC_MEDIA_URL`, les liens pointent vers le bucket et les copies locales des vidéos complètes sont retirées de dist/. Sans elle, le site lit les vidéos chez lui, ce qui convient au développement.

## Mise en ligne (GitHub Pages)

À chaque push sur `master`, .github/workflows/pages.yml construit le site, lance les tests et le publie sur https://soywod.github.io/vincent/. Il suffit que GitHub Pages soit réglé sur « GitHub Actions » (Settings > Pages > Source).

## Contenu

Textes, coordonnées et mentions légales sont dans src/content.ts. Les valeurs entre [crochets] sont des emplacements en attente du contenu réel : le build affiche la liste de celles qui restent.

Pour le portrait, déposer la photo dans public/ et renseigner `portrait` dans src/content.ts.

## Organisation

- astro.config.ts : configuration, sitemap, rapport des emplacements restants.
- src/pages/ : une page par fichier (accueil, mentions légales, robots.txt, llms.txt).
- src/layouts/Base.astro : gabarit commun (balises `<head>`, polices, pied de page).
- src/components/ : un composant `.astro` et sa feuille de style par bloc de page.
- src/scripts/ : le JavaScript du navigateur (reveal.ts, carousel.ts, previews.ts, player.ts).
- src/styles/ : couleurs, polices, styles communs, apparition au scroll, grille de fond.
- src/content.ts : identité, accroche, coordonnées, mentions légales.
- src/works.ts : liste des vidéos (media.json), tri par date, séparation réels et paysages, adresse des vidéos complètes.
- src/seo.ts : JSON-LD, llms.txt, robots.txt.
- scripts/encode-videos.sh : fabrique miniatures, aperçus et vidéos web.
- scripts/dist.test.mjs : contrôles sur le site construit.

## Comportement des aperçus

- Souris : l'aperçu muet se lance au survol (ou au focus clavier) et s'arrête à la sortie.
- Écran tactile : la vidéo qui passe au milieu de l'écran joue, une seule à la fois.
- Carrousel des réels : il défile tout seul quand les réels débordent de la largeur, et s'arrête au survol, au focus et pendant la lecture. Sur écran tactile, ses aperçus ne se lancent pas tout seuls.
- Un clic ou un appui ouvre la vidéo complète, avec le son, dans une fenêtre.
- `prefers-reduced-motion` : aucun aperçu automatique, aucune animation.
- Aucune vidéo n'est téléchargée avant la première interaction.
