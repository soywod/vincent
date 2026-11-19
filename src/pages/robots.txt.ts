import type { APIRoute } from 'astro'
import { origin, robotsTxt } from '../seo'

export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt(origin(site)), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
