import { homePath } from './content'
import media from './data/media.json'

/** One entry of src/data/media.json, written by scripts/encode-videos.sh. */
export type MediaEntry = {
  slug: string
  /** Source file name without its extension, shown as is. */
  title: string
  /** Name of the full video in the bucket (PUBLIC_MEDIA_URL). */
  remote: string
  /** ISO 8601, orders the list: most recent first. */
  date: string
  width: number
  height: number
  /** Seconds. */
  duration: number
}

export type Work = MediaEntry & {
  /** Portrait video (reel, short), shown in the carousel. */
  portrait: boolean
  posterAvif: string
  posterJpg: string
  preview: string
  full: string
}

/**
 * Where the full videos are served from. They are too heavy for Git, so
 * in production they live in a storage bucket whose public address is
 * given at build time (PUBLIC_MEDIA_URL=https://media.example.fr), each
 * one stored under its `remote` name. Without it they are read from the
 * site itself, which is what local development does.
 *
 * Posters and previews always come from the site: they are small and
 * tracked in Git.
 */
const bucket = import.meta.env.PUBLIC_MEDIA_URL?.replace(/\/+$/, '')

export function buildWorks(
  entries: MediaEntry[],
  options: { base: string; bucket?: string },
): Work[] {
  return entries
    .toSorted(
      (a, b) =>
        b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'fr'),
    )
    .map((entry) => {
      const local = `${options.base}media/${entry.slug}`
      return {
        ...entry,
        portrait: entry.height > entry.width,
        posterAvif: `${local}/poster.avif`,
        posterJpg: `${local}/poster.jpg`,
        preview: `${local}/preview.mp4`,
        full: options.bucket
          ? `${options.bucket}/${encodeURIComponent(entry.remote)}`
          : `${local}/full.mp4`,
      }
    })
}

export const works = buildWorks(media as MediaEntry[], { base: homePath, bucket })

/** Reels and shorts, shown first in a scrolling carousel. */
export const reels = works.filter((work) => work.portrait)

/** 16:9 videos, shown in the grid below the carousel. */
export const landscapes = works.filter((work) => !work.portrait)
