# Publish Elsewhere

Elsewhere builds an ordinary static website. **Publish the contents of `dist/`**, so that `index.html` sits at the location visitors open. Node.js is needed to build the page, not to serve it publicly. No Sites account, application server, or database is required.

Publishing is your choice. The included GitHub Pages workflow is a prepared deployment route; its presence does not mean a repository or live site has been created or tested.

## Start from the source ZIP

1. Extract the source ZIP into a folder you will keep. Work in the folder containing `profile.json`, `package.json`, `public/`, and `scripts/`.
2. For a clean starting point, copy the contents of `starter.json` into `profile.json`. Use a plain-text editor to replace the sample identity and links. Keep `"demo": false` and follow [CUSTOMIZATION.md](CUSTOMIZATION.md). Put your public images in `public/assets/`.
3. Install Node.js 22 or newer if it is not already available. Open a terminal in the extracted folder and run the commands below. There are no npm dependencies to install.
4. Open the local address printed by `npm start`, usually `http://127.0.0.1:4173`. Check the content and follow your links. Use Ctrl+C in the terminal to stop the server.
5. Keep the source folder for future edits. Publish only after reviewing the generated page.

```sh
npm test
npm run build
npm start
```

After each edit, run `npm run build` again and reload the browser. A successful build replaces `dist/`; do not make lasting edits there. An invalid configuration or missing referenced image stops the build before replacing the previous output.

## Any static host

Use the host’s static-file upload or deployment facility. Upload everything **inside** `dist/`, including `assets/` and the generated `.nojekyll` file. Do not upload the source folder as the website root unless you have deliberately configured that host to build it.

For a host that builds from your source repository, the relevant settings are:

| Setting | Value |
|---|---|
| Runtime used during build | Node.js 22 or newer |
| Build command | `npm run build` |
| Publish/output directory | `dist` |
| Application start command | None; serve static files |

The template does not require a provider-specific configuration. The host supplies its own deployment method, domain settings, HTTPS, and request-log policy. Before replacing an existing site, save its source and deployed files and confirm that you can restore them.

## Domain root or a subfolder

The generated assets use relative paths. The same folder can live at `https://example.com/` or `https://example.com/links/`, provided its `index.html` and `assets/` stay together. For a directory URL, use a host that serves `index.html` and redirects the directory address to its trailing-slash form.

Set `site.url` to the final public page address when you know it:

```json
"site": {
  "title": "Your name",
  "description": "A brief description of your page.",
  "url": "https://example.com/links/"
}
```

**Keep the trailing slash for a directory homepage.** It ensures a sharing image such as `assets/share.jpg` resolves under `/links/`, rather than at the domain root. A literal page URL such as `https://example.com/links/index.html` is also possible if that is the actual canonical address. `site.url` supplies metadata; it does not configure hosting, redirects, or a custom domain.

Destination links have their own paths. `work/` stays within the current site folder; `/work/` starts at the domain root. Use complete `https://…` addresses for other websites. See the [path examples](CUSTOMIZATION.md#links-and-local-paths) before moving between a root domain and a repository subpath.

## GitHub Pages: manual release workflow

For a new standalone repository:

1. Put the extracted **source** files at the repository root. Include `.github/workflows/pages.yml`; hidden folders can be easy to miss when copying from a ZIP. Do not bring another site’s `.git/` directory or preview-host configuration.
2. Commit your customized `profile.json` with `"demo": false` and any public assets. Keep the workflow file on the repository’s default branch.
3. In the repository, select **Settings → Pages → Build and deployment → Source → GitHub Actions**. The included workflow is sufficient; do not add a second deployment workflow for the same site.
4. Open **Actions → Publish to GitHub Pages → Run workflow**, select the intended branch, and run it. The workflow tests, builds, uploads `dist/`, and deploys that artifact.
5. Wait for the workflow to finish successfully. Open the deployment URL from its result and verify the actual public page, assets, links, and metadata. A submitted workflow is not proof of publication.

The workflow has only a manual trigger. A source push alone does not release an update. For subsequent releases, commit the changes and run the workflow again. Repository permissions, Pages availability, and any deployment-environment rules still apply. [GitHub’s publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

A user site normally uses a repository named `<owner>.github.io` and lives at the domain root. A project site normally lives at `https://<owner>.github.io/<repository>/`. Use that complete subpath, with its trailing slash, in `site.url`. Configure a custom domain through GitHub Pages settings if you choose one; editing `site.url` does not attach it. [GitHub Pages site types](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

## GitHub Pages is not Jekyll

GitHub Pages is the host. Jekyll is one possible generator. Elsewhere uses its own small Node build and **does not require Jekyll or install as a Jekyll theme**. Its generated `.nojekyll` file supports serving the completed static output without Jekyll processing when using a branch-based static publishing route. The included Actions workflow already publishes built files. [GitHub publishing modes](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

To keep a Jekyll blog alongside Elsewhere, the least disruptive option is a separate `/links/` page. Build Elsewhere, then integrate its generated `index.html` and `assets/` under that directory in the blog’s final published output. Keep asset names scoped to that directory and set the canonical URL accordingly. If integrating through the Jekyll source, use plain generated HTML without YAML front matter and verify the combined build. [Jekyll’s static-file documentation](https://jekyllrb.com/docs/static-files/)

Do **not** copy Elsewhere’s `.nojekyll` to the root of a blog that relies on GitHub’s Jekyll build, or replace the blog’s publishing workflow with this standalone workflow. A combined Actions pipeline can build the blog first, copy Elsewhere’s files into the finished blog output, and publish that one combined artifact. That integration is a separate change to review and test; it is not provided automatically.

## Before sharing the URL

- Confirm the deployed page contains your content and no demonstration bar or sample destinations.
- Check the page at a narrow viewport, follow every destination, and test keyboard focus and appearance controls.
- Confirm a portrait, favicon, and sharing image load at the deployed URL if configured.
- Confirm `site.url` points to the public location rather than a local preview or former host.
- Keep the source and a known-good release so that later changes can be reversed.

For accessibility checks and stated verification limits, see [ACCESSIBILITY.md](ACCESSIBILITY.md). Deployment has not been verified merely by following or packaging these instructions.
