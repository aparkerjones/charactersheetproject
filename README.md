# D&D Character Sheet

## Local development

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run validation locally with `npm test` and `npm run lint`.

## GitHub Pages online test

The manual workflow in `.github/workflows/pages.yml` runs tests and lint, builds a
static export, and deploys it to GitHub Pages. The Pages build uses the project
URL path `/charactersheetproject`; ordinary local builds are unaffected.
The Pages export disables Next.js Cache Components and partial prefetching,
which require server capabilities not available on a static host.

To publish, configure **Settings → Pages → Build and deployment → Source** to
**GitHub Actions**, then run **Deploy GitHub Pages** from the repository's Actions
tab using **Run workflow**. The workflow is intentionally manual and does not
publish automatically on every push.

GitHub Pages sites are public by default, even when their source repository is
private. Private Pages access requires an organization-owned repository on GitHub
Enterprise Cloud. A private source repository with a public Pages site also
requires an account plan that supports Pages for private repositories.

The app currently stores characters in the browser's local storage; Pages will
not synchronize character data between devices or users. Do not enter sensitive
information into the public test site.
