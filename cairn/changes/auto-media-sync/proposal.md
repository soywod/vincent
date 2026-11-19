---
cairn: change
id: auto-media-sync
status: draft
created: 2026-11-19
---

# Synchroniser automatiquement les vidéos du bucket

## Why

Aujourd'hui, ajouter une vidéo demande trois gestes : lancer `npm run encode` sur les sources, déposer la vidéo complète dans le bucket R2 `media`, puis commiter et pousser. Le but est que Vincent n'ait qu'à déposer (ou supprimer) une vidéo dans le bucket, et que le site se mette à jour seul.

Pas nécessaire pour l'instant : la version manuelle suffit. Ce document garde la réflexion pour le jour où le besoin apparaît.

## What

Le bucket devient la seule source des vidéos. Une GitHub Action, dans le même workflow que le déploiement :

1. Liste le bucket par l'API S3 de R2, avec une clé en lecture seule rangée dans les secrets GitHub.
2. Compare avec src/data/media.json, enrichi de l'`etag` et de la taille de chaque objet pour repérer une vidéo remplacée sous le même nom.
3. Télécharge seulement les vidéos nouvelles ou modifiées et lance scripts/encode-videos.sh (ffmpeg est disponible sur les runners).
4. Retire les entrées et les dossiers public/media/<slug>/ des vidéos supprimées du bucket.
5. Commite miniatures, aperçus et media.json, puis construit et déploie dans le même workflow : un push fait avec le `GITHUB_TOKEN` ne déclenche pas les autres workflows, donc .github/workflows/pages.yml ne prendrait pas le relais.

### Déclencheur

Trois niveaux, seul le déclencheur change, le job reste le même :

- `workflow_dispatch` : bouton « Run workflow », immédiat mais manuel.
- `schedule` (cron, par exemple toutes les heures) : jusqu'à une heure d'attente, parfois plus car GitHub retarde les crons. Une liste par heure fait environ 720 opérations de classe A par mois, loin du palier gratuit R2. Les Actions sont gratuites sur un dépôt public.
- Notification d'événement R2 vers une file Cloudflare Queues, consommée par un petit Worker qui appelle `repository_dispatch` sur GitHub (token GitHub stocké dans le Worker). Délai d'une à deux minutes. Vérifier avant que les Queues sont disponibles sur l'offre Cloudflare du compte.

Recommandation : commencer par cron et bouton, passer aux événements R2 seulement si l'attente gêne.

## Décisions à prendre avant de commencer

- Date de tri : en CI, la date de modification du fichier téléchargé est celle du téléchargement et ne vaut rien. Choisir entre la `creation_time` du fichier (comportement actuel) et la date de dépôt dans R2 (`LastModified`), plus prévisible : la dernière déposée apparaît en premier.
- Fichiers non prêts pour le web (`.mov`, ProRes, `moov` en fin de fichier) : soit la CI convertit et redépose la version web dans le bucket (clé en écriture, remplace des fichiers de Vincent), soit elle les ignore et le signale dans le résumé du job. Préférence : signaler, avec la règle « exporter en MP4 H.264 ».
- Corrections sans renommer le fichier (titre, ordre, masquer une vidéo) : un petit fichier de surcharges dans le dépôt, le jour où le besoin apparaît.
- Commits du bot sur `master` : faire `git pull` avant de travailler en local, pour éviter les conflits sur media.json.
