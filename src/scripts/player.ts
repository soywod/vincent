// Full video, with sound and native controls, in the modal <dialog> of
// src/components/Works.astro: focus trapping, Escape and the backdrop
// come from the platform. Without scripting, a card is a plain link to
// its video file.

import { suspendPreviews } from './previews'

const dialog = document.querySelector<HTMLDialogElement>('dialog.player')
const video = dialog?.querySelector<HTMLVideoElement>('.player__video')
const title = dialog?.querySelector<HTMLElement>('.player__title')

if (dialog && video && title) {
  for (const card of document.querySelectorAll<HTMLAnchorElement>('.work')) {
    card.addEventListener('click', (event) => {
      // Modified clicks keep their meaning (new tab, download).
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      event.preventDefault()
      suspendPreviews(true)

      title.textContent = card.dataset.title ?? ''
      // Sizes the dialog to the video (src/components/VideoDialog.css).
      dialog.style.setProperty('--ratio', card.dataset.ratio ?? '')
      video.poster = card.dataset.poster ?? ''
      video.src = card.href

      dialog.showModal()
      video.play().catch(() => {})
    })
  }

  // The backdrop belongs to the dialog element itself; its content is
  // wrapped, so a direct hit means "outside".
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })

  // Dropping the source stops the download of what was not watched.
  dialog.addEventListener('close', () => {
    video.pause()
    video.removeAttribute('src')
    video.removeAttribute('poster')
    video.load()
    suspendPreviews(false)
  })
}
