# QuadDaily

Organize tasks on a daily four-quadrant canvas: the horizontal axis represents priority, the vertical axis represents difficulty, and a todo list is generated automatically.

## Commands

```sh
npm run dev
npm run test
npm run lint
npm run build
npm run format:check
```

## Stack

- React and TypeScript
- Vite
- Vitest and React Testing Library
- ESLint and Prettier

## Deployment

Pure static SPA (state lives in `localStorage`, no backend). Pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`. Live at https://m1n9o.github.io/quad-daily/.
