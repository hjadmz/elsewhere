# Make Elsewhere yours

Edit **`profile.json`**, then run `npm run build` and refresh the preview. It is a small configuration file, not a visual page builder. Start with your name, one sentence, and the links someone would actually need. Add a portrait or grouping only when useful.

The included `starter.json` is a short, non-demo starting point. Copy its contents into `profile.json` and replace the placeholders. The build reads `profile.json`; editing `starter.json` alone does not change the site.

JSON uses double quotes, commas between entries, and no comments or trailing commas. Text is treated as text; HTML is escaped. The build reports the field containing an invalid value. Fix that value and rebuild.

## A small complete profile

Replace the example addresses with your real destinations before publishing.

```json
{
  "name": "Your name",
  "bio": "A sentence about what you do or care about.",
  "groups": [
    {
      "links": [
        {"label": "My work", "url": "https://example.com/work/"},
        {"label": "LinkedIn", "url": "https://www.linkedin.com/in/your-profile/"},
        {"label": "Email me", "url": "mailto:hello@example.com"}
      ]
    }
  ],
  "demo": false
}
```

The defaults are the paper palette, blue accent, system appearance, English page language, and automatic text direction. You do not need to repeat them in the file.

## Content options

| Setting | Use |
|---|---|
| `name` | Required page heading. Use your name or the identity the page represents. |
| `eyebrow` | Optional short introduction above the name. |
| `bio` | Optional introduction. Use `\n` for an intentional line break. |
| `location` | Optional plain-text location or context. |
| `portrait` | Optional local image; see below. Omit the object for a text-only page. |
| `featured` | Optional single priority link, using the same fields as ordinary links. |
| `groups` | Required array of link groups. Each group contains a nonempty `links` array and an optional `title`. Use `[]` only when a featured link supplies the destination. |
| `sections` | Optional `auto`, `on`, or `off`. Leave it at `auto` for most profiles. |
| `footer` | Optional closing text. No public template credit is required. |
| `demo` | Set to `false` for your site. It defaults to false when omitted. |

Every link requires `label` and `url`. An optional `description` explains what is at the destination. An optional `destination: true` displays its hostname, email address, telephone number, or local path as secondary text; the default is false. This field changes the displayed detail, not where the link goes. Printed pages include each link’s full configured destination, even when this screen detail is hidden.

```json
"featured": {
  "label": "Selected work",
  "url": "https://example.com/work/",
  "description": "Three projects, with process and outcomes.",
  "destination": true
}
```

Array order is display order and keyboard order. For three links, an untitled group can be enough. For twenty, use helpful group titles and put the most relevant destinations first. Remove an empty group entirely. There is no platform registry: adding another social service requires only a readable label and URL.

With `sections` omitted or set to `auto`, the Sections menu appears when at least three titled groups contain at least twelve links in total. Set it to `on` when jumping saves time on a long page with fewer links or groups. This requires at least two titled groups. Set it to `off` when headings and ordinary scrolling suffice. The menu jumps to titled groups and can show the current group while scrolling. All destinations remain visible, and the section links work without JavaScript.

## Links and local paths

Supported destinations include `https:`, `http:`, `mailto:`, `tel:`, and ordinary local paths. External sites need the full scheme; `instagram.com/yourname` alone is a local path, not an external URL. Links open in the current tab. Visitors can choose another tab through their browser.

At `https://example.com/links/`, these resolve as follows:

| Configured URL | Destination |
|---|---|
| `https://another.example/work/` | That other website |
| `work/` | `https://example.com/links/work/` |
| `assets/resume.pdf` | `https://example.com/links/assets/resume.pdf` |
| `/work/` | `https://example.com/work/` |
| `mailto:hello@example.com` | The visitor’s email handler |
| `tel:+15551234567` | The visitor’s telephone handler |

Place a linked PDF at `public/assets/resume.pdf`; place another local page at the corresponding path under `public/`. The build validates URL format but does not prove that every destination exists or remains available. Check your links after deployment. Parent-directory traversal (`../`), unsafe URL schemes, embedded URL credentials, and control characters are rejected.

## Portrait, favicon, and sharing image

Put your image in `public/assets/` and reference it without the `public/` prefix. Local asset paths use ASCII letters, numbers, dashes, underscores, dots, and subfolders; avoid spaces. Portraits and sharing images support AVIF, GIF, JPEG, PNG, SVG, and WebP; favicons support SVG, PNG, or ICO. Prefer a modestly sized, optimized portrait over a full camera original. JPEG or PNG is a practical sharing-image choice; individual sharing services determine their own supported formats.

```json
"portrait": {
  "src": "assets/portrait.webp",
  "alt": ""
},
"site": {
  "title": "Your name",
  "description": "A short description for search and sharing.",
  "url": "https://example.com/links/",
  "image": "assets/share.jpg",
  "favicon": "assets/my-icon.svg"
}
```

An empty portrait alt is appropriate when the image adds no information beyond the adjacent name. If the image conveys something important, supply concise descriptive alt text. Removing the entire portrait object removes the image without leaving an empty placeholder.

`site.title` defaults to the name; `site.description` defaults to the bio. `site.image` is optional and requires `site.url` so its address can be made absolute. Use the final canonical page URL and **include the trailing slash for a directory homepage**, such as `/links/`. Metadata does not configure a domain or redirect. Sharing platforms may cache previews and do not guarantee identical presentation.

`site.favicon` is optional; the default is the supplied `assets/favicon.svg`. Use a local asset, not a remote favicon service. Your portrait, favicon, and sharing image can be different files.

## Appearance and language

```json
"appearance": {
  "palette": "paper",
  "accent": "blue",
  "theme": "system"
}
```

Choose `paper` or `stone`; `blue`, `rust`, or `forest`; and `system`, `light`, or `dark`. These are deliberately limited choices with coordinated light/dark colors. Visitors can change appearance themselves. There is no font selector, arbitrary color picker, layout registry, icon pack, or HTML injection setting.

Set `lang` to a language tag such as `en`, `fr`, or `ar`. `direction` accepts `auto`, `ltr`, or `rtl`. Translate your own text and, when needed, the interface labels:

```json
"lang": "fr",
"labels": {
  "lang": "fr",
  "skipLink": "Aller aux liens",
  "sections": "Rubriques",
  "appearance": "Apparence",
  "system": "Système",
  "light": "Clair",
  "dark": "Sombre"
}
```

The page language and interface-label language can differ. Interface labels and `labels.lang` default to English even when the page’s `lang` changes. Translate all labels together and set their `lang` accurately. Setting a language tag does not translate text. Check longer translations and the actual script you use; system fallback fonts supply characters absent from the bundled fonts.

## Public files and lasting edits

**Everything you deliberately place in `public/` is intended for publication.** It is copied to `dist/`, except that the bundled demonstration guide is omitted for a non-demo build. Keep drafts, private files, backups, credentials, and source-only notes elsewhere. Generated `index.html` is owned by the renderer; do not place a competing homepage in `public/`.

Setting `demo` to false removes the demonstration bar, generated example pages, bundled guide, and demo `noindex` metadata. It does not inspect or remove additional files you put in `public/`.

The bundled fonts are self-hosted Atkinson Hyperlegible Next and Mono. Keep their SIL Open Font License notices with redistributed font files. The template source uses the MIT license; retain its license notice when redistributing the source. Use only images and other assets you have permission to publish.

For deeper changes, edit `public/assets/site.css` for styling or `src/render.mjs` for structure. Those are source changes, not supported configuration options. Preserve native links, visible focus, readable contrast, and responsive wrapping; repeat the checks in [ACCESSIBILITY.md](ACCESSIBILITY.md). A passing default palette test does not validate colors you add yourself.

Keep `profile.json`, `public/`, and the source in a backup or Git repository. Do not rely on `dist/` as your editable source. Once the local result is ready, follow [HOSTING.md](HOSTING.md).
