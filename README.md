# Kubernetes Explainer

Interactive, visual architecture tour of every Kubernetes component — built in the spirit of the Transformer Explainer, with real-world examples, animated flow connectors, and deep-dive explanations for every part of a cluster.

**Built by [Anas Kadambalath](https://github.com/anaskmh)**

## Features

- **35+ components** covering control plane, worker nodes, workload APIs, networking, storage, security, autoscaling, and extensibility
- **Real-world examples** for every component with scenario, action, and sample output
- **Animated flow connectors** with gradient paths and traveling particles
- **Group-colored zones** — blue for clients, purple for control plane, green for workers
- **Official documentation links** to the matching page on kubernetes.io
- **Full-text search** across all components

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

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
