import { fullName, homePath, site, tagline } from './content'
import { works } from './works'

/**
 * Public address of the home page (origin and base) without its trailing
 * slash, when SITE_URL is set.
 */
export function origin(siteUrl: URL | undefined): string | undefined {
  return siteUrl && new URL(homePath, siteUrl).href.replace(/\/+$/, '')
}

/** Contact links worth citing: placeholders are left out. */
function realContacts() {
  return site.contact.filter((link) => !link.value.includes('['))
}

/**
 * schema.org description of the person behind the site, serialized for
 * an inline <script type="application/ld+json">.
 */
export function personJsonLd(siteUrl?: string): string {
  const profiles = realContacts()
    .filter((link) => link.external)
    .map((link) => link.href)

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: fullName,
    givenName: site.firstName,
    familyName: site.lastName,
    jobTitle: site.job,
    description: tagline,
    ...(siteUrl ? { url: siteUrl } : {}),
    ...(profiles.length > 0 ? { sameAs: profiles } : {}),
  }).replaceAll('<', '\\u003c')
}

/**
 * Plain-text summary for AI crawlers, served as /llms.txt. Contact links
 * still carrying placeholder texts are left out, and so are the sections
 * they would have filled.
 */
export function llmsTxt(siteUrl?: string): string {
  const section = (heading: string, items: string[]) =>
    items.length > 0 ? ['', `## ${heading}`, '', ...items] : []

  const lines = [
    `# ${fullName}`,
    '',
    `> ${site.job}. ${tagline}`,
    ...section(
      'Créations',
      works.map((work) => {
        // Already absolute when the videos are served from a bucket.
        const url = siteUrl ? new URL(work.full, siteUrl).href : work.full
        return `- [${work.title}](${url})`
      }),
    ),
    ...section(
      'Contact',
      realContacts().map((link) => `- ${link.label} : ${link.value}`),
    ),
  ]

  return `${lines.join('\n')}\n`
}

/** robots.txt: everything is open, AI crawlers included. */
export function robotsTxt(siteUrl?: string): string {
  const bots = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']

  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# AI crawlers are welcome: the site is meant to be read and cited.',
    ...bots.flatMap((bot) => [`User-agent: ${bot}`, 'Allow: /', '']),
    ...(siteUrl ? [`Sitemap: ${siteUrl}/sitemap-index.xml`] : []),
  ]

  return `${lines.join('\n').trimEnd()}\n`
}
