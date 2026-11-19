interface ImportMetaEnv {
  /**
   * Public address of the bucket holding the full videos, without a
   * trailing slash. See src/works.ts.
   */
  readonly PUBLIC_MEDIA_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
