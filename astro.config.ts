import { readdir, readFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sitemap from '@astrojs/sitemap'
import type { AstroIntegration } from 'astro'
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

// Public address of the site, e.g. SITE_URL=https://example.fr, or
// SITE_URL=https://user.github.io/repo for a site served under a path:
// that path becomes the base every link starts with. Canonical links,
// og:url and the sitemap need it and are left out without it.
const siteUrl = process.env.SITE_URL ? new URL(process.env.SITE_URL) : null
const site = siteUrl?.origin
const base = siteUrl?.pathname.replace(/\/*$/, '/') ?? '/'

// Public address of the bucket serving the full videos (src/works.ts),
// read the way the pages read it: from the environment or a .env file.
const { PUBLIC_MEDIA_URL: mediaUrl } = loadEnv(
  process.env.NODE_ENV ?? 'production',
  process.cwd(),
  'PUBLIC_',
)

/**
 * When the full videos are served from a bucket, removes from the build
 * the local copies that public/media/ may hold: nothing links to them
 * anymore, and static hosts reject files of that size.
 */
function remoteFullVideos(): AstroIntegration {
  return {
    name: 'remote-full-videos',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir)
        const files = await readdir(root, { recursive: true })
        const copies = files.filter((file) =>
          /^media\/[^/]+\/full\.mp4$/.test(file),
        )

        for (const file of copies) await rm(`${root}/${file}`)
        if (copies.length > 0) {
          logger.info(
            `${copies.length} full video(s) left out of dist/: served from ${mediaUrl}`,
          )
        }
      },
    },
  }
}

/**
 * Reports, at the end of a build, the [bracketed] placeholder texts
 * still visible in the pages (see src/content.ts), so none of them can
 * ship unnoticed.
 */
function placeholderReport(): AstroIntegration {
  return {
    name: 'placeholder-report',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir)
        const files = await readdir(root, { recursive: true })
        const found = new Set<string>()

        for (const file of files) {
          if (!file.endsWith('.html')) continue
          const html = await readFile(`${root}/${file}`, 'utf8')
          const text = html
            .replace(/<(script|style)\b[^>]*>.*?<\/\1>/gs, '')
            .replace(/<[^>]+>/g, ' ')
          for (const [match] of text.matchAll(/\[[^\][]{2,80}\]/g)) {
            found.add(match)
          }
        }

        if (found.size > 0) {
          logger.warn(
            `Placeholders still in the pages:\n${[...found].map((text) => `  ${text}`).join('\n')}`,
          )
        }

        if (!site) {
          logger.warn(
            'SITE_URL is not set: no canonical links, og:url or sitemap were written.',
          )
        }
      },
    },
  }
}

export default defineConfig({
  site,
  base,
  // Whitespace between inline elements is meaningful in the templates
  // ("Mes <span>créations</span>"): only collapse it, never drop it.
  compressHTML: true,
  integrations: [
    ...(site ? [sitemap()] : []),
    ...(mediaUrl ? [remoteFullVideos()] : []),
    placeholderReport(),
  ],
})
