---
cairn: tasks
change: auto-media-sync
---

- [ ] Trancher la date de tri (`creation_time` ou `LastModified` R2)
- [ ] Trancher le sort des fichiers non prêts pour le web
- [ ] Créer une clé API R2 en lecture seule sur le bucket `media` et la ranger dans les secrets GitHub
- [ ] Ajouter `etag` et taille à src/data/media.json
- [ ] Adapter scripts/encode-videos.sh pour lire la liste du bucket, ne traiter que les différences et retirer les vidéos supprimées
- [ ] Workflow de synchronisation (cron et `workflow_dispatch`) qui commite puis construit et déploie
- [ ] Mettre à jour le README (procédure d'ajout de vidéo)
- [ ] Optionnel : notification R2, Queue et Worker vers `repository_dispatch`
