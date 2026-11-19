// Checks the built site (run `npm run build` first): what crawlers and
// visitors without scripting receive must already be complete.

import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

// Path of the site under its domain (SITE_URL=https://user.github.io/repo
// serves it under /repo/): links carry it, dist/ does not.
const base = new URL(
  process.env.SITE_URL ?? 'http://localhost/',
).pathname.replace(/\/*$/, '/')
const inDist = (href) => join(dist, href.slice(base.length))

// Attribute values as Astro writes them, and as a regular expression.
const entities = { '&': 'amp', '<': 'lt', '>': 'gt', "'": '#39', '"': 'quot' }
const escapeHtml = (text) =>
  text.replace(/[&<>'"]/g, (char) => `&${entities[char]};`)
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const cardOf = (title) =>
  new RegExp(
    `<a [^>]*href="([^"]+)"[^>]*data-title="${escapeRegExp(escapeHtml(title))}"`,
  )

const read = (path) => readFile(join(dist, path), 'utf8')
const media = JSON.parse(
  await readFile(join(root, 'src/data/media.json'), 'utf8'),
)

test('home page is rendered with its content', async () => {
  const html = await read('index.html')

  assert.match(html, /<html lang="fr">/)
  assert.match(html, /<h1[^>]*>.*Vincent.*Douin.*<\/h1>/s)
  assert.match(html, /je serai le <strong[^>]*>bras droit<\/strong> de votre/)
  assert.match(html, /Me contacter/)
})

test('home page head describes the page', async () => {
  const html = await read('index.html')

  assert.match(html, /<title>Vincent Douin · [^<]+<\/title>/)
  assert.match(html, /<meta name="description" content="[^"]{50,}"/)
  assert.match(html, /<link rel="preload"[^>]+as="font"/)

  const [, json] = html.match(
    /<script type="application\/ld\+json">(.+?)<\/script>/s,
  )
  const data = JSON.parse(json)
  assert.equal(data['@type'], 'Person')
  assert.equal(data.name, 'Vincent Douin')
})

test('preloaded fonts exist', async () => {
  const html = await read('index.html')
  const preloads = [
    ...html.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g),
  ]

  assert.equal(preloads.length, 2)
  for (const [, href] of preloads) await access(inDist(href))
})

test('contact details are in the markup, not behind scripting', async () => {
  const html = await read('index.html')

  assert.match(html, /<details[^>]*>.*href="tel:[^"]+".*<\/details>/s)
  assert.match(html, /href="mailto:[^"]+"/)
})

test('every video is linked and its assets exist', async () => {
  const html = await read('index.html')

  for (const { slug, title, remote } of media) {
    const card = html.match(cardOf(title))
    assert.ok(card, `${title} is not linked from the home page`)
    const [, href] = card

    for (const file of ['poster.avif', 'poster.jpg', 'preview.mp4']) {
      await access(join(dist, 'media', slug, file))
    }

    // The full video is either shipped with the site, or served from a
    // bucket (PUBLIC_MEDIA_URL) and then absent from the build.
    const local = join(dist, 'media', slug, 'full.mp4')
    if (href === `${base}media/${slug}/full.mp4`) {
      await access(local)
    } else {
      const expected = `/${encodeURIComponent(remote)}`
      assert.match(href, /^https:\/\//, `${title} has an unexpected address`)
      assert.ok(href.endsWith(expected), `${title} links to ${href}`)
      await assert.rejects(access(local), `${title} is also shipped in dist/`)
    }
  }
})

test('videos are listed most recent first, reels apart', async () => {
  const html = await read('index.html')
  const titles = [...html.matchAll(/data-title="([^"]+)"/g)].map(([, t]) => t)
  const byDate = media.toSorted((a, b) => b.date.localeCompare(a.date))
  const reels = byDate.filter((entry) => entry.height > entry.width)
  const landscapes = byDate.filter((entry) => entry.height <= entry.width)

  assert.deepEqual(
    titles,
    [...reels, ...landscapes].map(({ title }) => escapeHtml(title)),
  )
})

test('no video is requested before interaction', async () => {
  const html = await read('index.html')

  // <video> elements are in the page, but without a source to fetch.
  assert.doesNotMatch(html, /<video\b[^>]*\ssrc=/)
  assert.doesNotMatch(html, /<video\b[^>]*\sautoplay/)
})

test('the page ships a few kilobytes of script, no framework runtime', async () => {
  const html = await read('index.html')
  let bytes = 0

  // Scripts are either inlined in the page or referenced from it.
  for (const [, attributes, body] of html.matchAll(
    /<script\b([^>]*)>(.*?)<\/script>/gs,
  )) {
    if (attributes.includes('application/ld+json')) continue
    const [, src] = attributes.match(/\ssrc="([^"]+)"/) ?? []
    bytes += src ? (await read(src)).length : body.length
  }

  assert.ok(bytes > 0, 'no script found: previews and reveals are missing')
  assert.ok(bytes < 10_000, `${bytes} bytes of script`)
})

test('legal page is rendered with its own title', async () => {
  const html = await read('mentions-legales/index.html')

  assert.match(html, /<title>Mentions légales · Vincent Douin<\/title>/)
  assert.match(html, /<h1[^>]*>.*Mentions.*légales.*<\/h1>/s)
  assert.match(html, /SIRET/)
  assert.doesNotMatch(html, /application\/ld\+json/)
})

test('crawler files are written', async () => {
  assert.match(await read('robots.txt'), /User-agent: \*\nAllow: \//)
  assert.match(await read('llms.txt'), /^# Vincent Douin\n/)
})
