// Endless scrolling of the reels carousel (src/components/Works.astro).
//
// Without this script, or with reduced motion, the carousel is a plain
// row that scrolls sideways. Here its cards are repeated until one copy
// can slide out while the next fills the row, then the track slides by
// one copy in a loop (styles in src/components/Works.css). The copies
// are hidden from assistive technologies and from keyboard navigation.
//
// It runs before src/scripts/previews.ts and src/scripts/player.ts, so
// the copies get the same previews and the same player as the cards.

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const carousel = document.querySelector<HTMLElement>('.reels')
const track = carousel?.querySelector<HTMLElement>('.reels__track')

if (carousel && track && !reducedMotion.matches) {
  const cards = [...track.children] as HTMLElement[]
  // The track is as wide as its cards, trailing margins included.
  const setWidth = track.offsetWidth

  // Only loops when the cards overflow the row: a few reels that fit
  // stay still rather than chasing their own copies.
  if (cards.length > 0 && setWidth > carousel.clientWidth) {
    // Enough copies for the widest window this screen can show.
    const widest = Math.max(screen.width, innerWidth)
    const copies = Math.min(Math.ceil(widest / setWidth) + 1, 12)

    for (let copy = 1; copy < copies; copy++) {
      for (const card of cards) {
        const clone = card.cloneNode(true) as HTMLElement
        clone.setAttribute('aria-hidden', 'true')
        clone.tabIndex = -1
        track.append(clone)
      }
    }

    track.style.setProperty('--copies', String(copies))
    // About 40 px per second, whatever the number of reels.
    track.style.setProperty('--duration', `${Math.round(setWidth / 40)}s`)
    carousel.dataset.loop = ''
  }
}
