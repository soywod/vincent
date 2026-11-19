// Scroll reveal: elements carrying the `reveal` class fade in the first
// time they enter the viewport (styles in src/styles/base.css).

const show = (element: Element) => element.setAttribute('data-revealed', '')
const targets = document.querySelectorAll('.reveal')

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        show(entry.target)
        observer.unobserve(entry.target)
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  )

  for (const target of targets) observer.observe(target)
} else {
  targets.forEach(show)
}

// Tells the inline script of src/layouts/Base.astro that reveals can be
// trusted.
document.documentElement.setAttribute('data-ready', '')
