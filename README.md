# CloudTruck

Interactive visual explainers for Kubernetes, Docker, and modern DevOps systems, with animated workflows, real examples, troubleshooting drills, and a live careers board for the UAE and Saudi Arabia.

**Built by [Anas Kadambalath](https://github.com/anaskmh)**

## Current topics

- **Kubernetes**: cluster anatomy, control plane, worker nodes, workloads, networking, storage, security, autoscaling, and extensibility
- **Docker**: Dockerfile, BuildKit, images, registries, runtime internals, volumes, networking, Compose, and troubleshooting
- **CI/CD, Terraform, Monitoring, Linux, Cloud Foundations, GitOps**: same interactive shell, core concepts live
- **Careers**: career paths, learning roadmap, interview drills, and a filterable job board backed by Postgres

## Features

- **Topic switcher home page** for navigating Kubernetes and Docker from one app shell
- **Rich component panels** with intro, deep dive, real example, and official docs
- **Animated architecture flows** with enhanced workflow traces
- **Real-time troubleshooting blocks** for Docker operations and debugging
- **Careers navbar** with a live job board: filter by position, track, country, level, or keyword and apply on the original posting

## Local development

The quickest way is the helper script, which installs dependencies, sets up the jobs table if `.env` and the PDFs are present, and starts the dev server:

```bash
./run.sh
```

Run `./run.sh help` to see the individual commands (`dev`, `build`, `preview`, `db`, `db:migrate`, `db:extract`, `db:seed`, `db:refresh`). Or use npm directly:

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Pages and routes

The app uses React Router. Each view has its own URL, so pages can be linked and the browser back button works.

| Route | Page |
| --- | --- |
| `/` | Redirects to `/topics/kubernetes` |
| `/topics/:topicId` | Interactive explainer for one topic (`kubernetes`, `docker`, `cicd`, `terraform`, `monitoring`, `linux`, `cloud`, `gitops`) |
| `/careers` | Careers page: live job board, career paths, learning roadmap, interview drills |

Unknown routes redirect to the default topic. The Careers page is code-split and only downloads when visited. The Vercel rewrite in `vercel.json` serves `index.html` for every non-API path so deep links work in production.

The job board calls `/api/jobs`, which the Vite dev server mounts from `api/jobs.js` (see `vite.config.js`). It needs `DATABASE_URL` in a local `.env` file; copy `.env.example` and fill it in from the Neon dashboard. Without it the rest of the site works and the board shows an offline message.

## Jobs database

Job data lives in a Neon Postgres table (`jobs`) and is served by the Vercel function in `api/jobs.js`.

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Create or update the `jobs` table from `scripts/db/schema.sql` |
| `npm run db:extract` | Parse the PDFs in `docs/jobs/` (text plus hyperlinked apply URLs) into `data/jobs.json` |
| `npm run db:seed` | Upsert `data/jobs.json` into the table, matched on `external_key` |
| `npm run db:refresh` | Extract and seed, then mark rows missing from the PDFs as `closed` |

To load a new batch of vacancies, drop the updated PDFs in `docs/jobs/`, adjust `SOURCES` in `scripts/db/extract-jobs.mjs` if the filenames or columns changed, and run `npm run db:refresh`.

`GET /api/jobs` accepts `role`, `category`, `country`, `experience`, `status` (`open` by default, or `closed` / `all`), `q`, and `limit`. It returns the matching jobs plus facet counts for the filter dropdowns.

## Build for production

```bash
npm run build
```

The built site goes into `dist/`.

## Deploy to Vercel

### Option 1 — Vercel CLI (from this project folder)

```bash
npm install -g vercel
vercel
```

Follow the prompts. Vercel auto-detects Vite via `vercel.json` and deploys.

Add `DATABASE_URL` under the project's Environment Variables in Vercel so the `api/jobs.js` function can reach Neon.

### Option 2 — GitHub + Vercel Dashboard (recommended)

1. Push this folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:anaskmh/kubernetes-explainer.git
   git push -u origin main
   ```
2. Go to https://vercel.com/new
3. Import the GitHub repo
4. Vercel auto-detects Vite — just click **Deploy**
5. Your site will be live at `<project-name>.vercel.app` within ~60 seconds

### Why your previous 404 happened

Vercel served your uploaded `.jsx` file as a static asset, but there was no `index.html` entry point and no build step to turn JSX into browser-runnable JavaScript. This project fixes that: `index.html` is the entry, `vite build` compiles everything into `dist/`, and `vercel.json` tells Vercel to use that output.

## Tech stack

- React 18
- Vite 5
- framer-motion (smooth panel animations)
- lucide-react (icons)
- Pure SVG for diagram connectors with `animateMotion` for particle flow

## License

MIT — free to fork, share, and adapt.
