# Vesta — Radiology scheduling

Web app built for a radiologist at **Amiens University Hospital** to generate the
department's monthly on-call schedule: 5 specialties, a 6-week rotation, and manual
locks that the generator works around when it regenerates a month.

**Live demo:** https://pierre-moreau-phd.github.io/Vesta/

## Stack

- React + Vite + TypeScript
- Fully client-side — state persisted in `localStorage` (no backend)
- Deployed on GitHub Pages via GitHub Actions

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
```

## License

[MIT](LICENSE) © Pierre Moreau
