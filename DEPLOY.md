# Deploying TrustLayer

The app is committed and builds clean. Deployment needs you to sign in to
Vercel in a browser, which is the one step that cannot be automated.

## Option A — Vercel dashboard (no CLI, ~2 minutes)

1. Push this repo to GitHub. On github.com click **New repository**, name it
   `trustlayer`, leave it empty, then run what GitHub shows you:

   ```bash
   cd ~/Documents/trustlayer
   git remote add origin https://github.com/<your-username>/trustlayer.git
   git branch -M main
   git push -u origin main
   ```

2. Go to <https://vercel.com/new>, sign in with GitHub, pick the `trustlayer`
   repo, and click **Deploy**. Next.js is detected automatically; no settings
   to change and no environment variables to add.

3. Copy the deployed URL (something like `trustlayer.vercel.app`).

## Option B — Vercel CLI

```bash
npm i -g vercel
cd ~/Documents/trustlayer
vercel login      # opens a browser
vercel --prod
```

## Environment variables

None are required — demo mode is the intended public state, and the benchmark,
traces and tool calls all run without a key.

Optional, added later in Vercel → Settings → Environment Variables:

| Key | Effect |
| --- | --- |
| `OPENAI_API_KEY` | Enables model-assisted classification. Server-side only. |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini`. |
| `NEXT_PUBLIC_POSTHOG_KEY` | Sends product events to PostHog instead of the in-app buffer. |

## After deploying — two edits in the portfolio

Paste the URL in these two places, then rebuild the portfolio.

1. `~/Documents/portfolio/src/content/site.ts` — in the TrustLayer project,
   add:

   ```ts
   liveHref: 'https://your-url.vercel.app',
   ```

   The homepage card grows an "Open live experiment →" link.

2. `~/Documents/portfolio/src/app/work/trustlayer/page.tsx` — near the top:

   ```ts
   const LIVE_DEMO_URL: string | null = 'https://your-url.vercel.app';
   ```

   A "Try TrustLayer →" button appears in the hero and at the end of the case
   study.

Optionally, swap the portfolio backlink in `app/layout.tsx` of this repo
(`PORTFOLIO_URL`) from LinkedIn to the portfolio URL once that is deployed too.
