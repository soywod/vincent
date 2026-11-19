// Muted previews of the video cards (src/components/WorkCard.astro).
//
// With a mouse, a preview plays while its card is hovered or focused
// from the keyboard. Without a pointer to hover with, the one crossing
// the middle of the screen plays. Only one plays at a time, and a
// preview file is only requested the first time its card is activated.

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const touchOnly = matchMedia('(hover: none)')

const cards = [...document.querySelectorAll<HTMLAnchorElement>('.work')]
// The reels carousel sits across the middle line all at once and keeps
// moving: on touch screens its cards only open the player.
const gridCards = cards.filter((card) => !card.closest('.reels'))
const videoOf = (card: HTMLElement) =>
  card.querySelector<HTMLVideoElement>('.work__video')
const barOf = (card: HTMLElement) =>
  card.querySelector<HTMLElement>('.work__progress span')

let active: HTMLAnchorElement | null = null
let suspended = false
/** Re-evaluates which card sits mid-screen (touch devices only). */
let recheck: (() => void) | undefined

function stop(card: HTMLAnchorElement) {
  const video = videoOf(card)
  const bar = barOf(card)

  delete card.dataset.active
  if (video) {
    video.pause()
    if (video.hasAttribute('src')) video.currentTime = 0
    delete video.dataset.playing
  }
  if (bar) bar.style.scale = '0 1'
  if (active === card) active = null
}

function start(card: HTMLAnchorElement) {
  if (suspended || reducedMotion.matches || active === card) return
  if (active) stop(active)

  active = card
  card.dataset.active = ''

  const video = videoOf(card)
  if (!video) return
  if (!video.hasAttribute('src')) video.src = video.dataset.src ?? ''
  // Rejected when the card is left before playback starts.
  video.play().catch(() => {})
}

/** Stops previews while the full video plays, then lets them resume. */
export function suspendPreviews(value: boolean) {
  suspended = value
  if (value && active) stop(active)
  if (!value) recheck?.()
}

for (const card of cards) {
  const video = videoOf(card)
  const bar = barOf(card)

  card.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') start(card)
  })
  card.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') stop(card)
  })
  card.addEventListener('focus', () => {
    if (card.matches(':focus-visible')) start(card)
  })
  card.addEventListener('blur', () => stop(card))

  // The preview fades in over the poster once frames are flowing.
  video?.addEventListener('playing', () => {
    if (active === card) video.dataset.playing = ''
  })
  video?.addEventListener('timeupdate', () => {
    if (bar && video.duration > 0) {
      bar.style.scale = `${video.currentTime / video.duration} 1`
    }
  })
}

if (
  touchOnly.matches &&
  !reducedMotion.matches &&
  'IntersectionObserver' in window
) {
  // The observer's root is squeezed into a horizontal line at
  // mid-viewport: a card intersects it while it crosses the middle.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target as HTMLAnchorElement
        if (entry.isIntersecting) start(card)
        else if (active === card) stop(card)
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  )

  // Observing again makes the observer report the current state.
  recheck = () => {
    for (const card of gridCards) {
      observer.unobserve(card)
      observer.observe(card)
    }
  }
  recheck()
}
