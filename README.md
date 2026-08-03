# Obsidian Link Title

Renames Markdown notes whose entire body is exactly one HTTP(S) URL (surrounding whitespace allowed) to `domain — Page Title`.

Renaming is conservative and explicit: use the command palette command **Rename URL-only notes** or the settings button. It never runs at startup, so it cannot create automatic rename loops. Notes with any additional content are ignored. Existing files, malformed URLs, redirects, timeouts, non-HTML responses, missing titles, and network failures are skipped safely.

The plugin uses Obsidian's `requestUrl`, which follows Obsidian's desktop and mobile networking rules. It is not desktop-only and does not block startup. Hostnames are lowercased, leading `www.` is removed, and meaningful subdomains are retained. Unsafe filename characters are normalized and titles are bounded.

## Development

```sh
npm install
npm run lint
npm test
npm run build
```

## License

MIT
