/**
 * Site-wide identity and copy.
 *
 * Values written in [brackets] are placeholders waiting for the
 * client's real data. The build prints the ones still left in the
 * pages, so none of them can ship unnoticed.
 */

export type ContactLink = {
  label: string
  value: string
  href: string
  /** Opens in a new tab (social profiles), unlike tel: and mailto:. */
  external?: boolean
}

export type Portrait = {
  src: string
  width: number
  height: number
}

/**
 * Set once the photo exists, e.g.
 * { src: `${homePath}portrait.avif`, width: 1200, height: 1500 }.
 */
const portrait: Portrait | null = null

const contact: ContactLink[] = [
  { label: 'Téléphone', value: '[06 00 00 00 00]', href: 'tel:+33000000000' },
  {
    label: 'Email',
    value: '[contact@domaine.fr]',
    href: 'mailto:contact@exemple.fr',
  },
  {
    label: 'Instagram',
    value: '[@compte]',
    href: 'https://www.instagram.com/',
    external: true,
  },
]

export const site = {
  firstName: 'Vincent',
  lastName: 'Douin',
  job: 'Monteur vidéo & motion designer',
  title: 'Vincent Douin · Monteur vidéo & motion designer',
  /** Lead, emphasised words, rest of the sentence. */
  tagline: [
    "Fort de 10 ans d'expérience dans la vente, je serai le ",
    'bras droit',
    ' de votre business.',
  ] as const,
  portrait: portrait as Portrait | null,
  contact,
  legal: {
    siret: '[000 000 000 00000]',
    address: '[Adresse professionnelle]',
    host: '[Hébergeur : raison sociale, adresse, téléphone]',
  },
}

/** Root of the site, with its trailing slash (Astro's `base`). */
export const homePath = import.meta.env.BASE_URL.replace(/\/*$/, '/')

/** URL of the legal notice page (src/pages/mentions-legales.astro). */
export const legalPath = `${homePath}mentions-legales/`

export const fullName = `${site.firstName} ${site.lastName}`

export const tagline = site.tagline.join('')

export const description = `${fullName}, monteur vidéo et motion designer freelance. ${tagline}`
