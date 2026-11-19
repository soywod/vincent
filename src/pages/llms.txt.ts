import type { APIRoute } from 'astro'
import { llmsTxt, origin } from '../seo'

export const GET: APIRoute = ({ site }) =>
  new Response(llmsTxt(origin(site)), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
