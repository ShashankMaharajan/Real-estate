# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Figma export

With the dev server running (`npm run dev`), `npm run figma:export` captures every page
(desktop light, desktop dark, mobile) and writes a Figma plugin to
`figma-export/aangan-figma-plugin/` that rebuilds the site as editable layers. Its
`README.txt` explains how to run it in Figma. Add `--preview` to also write HTML previews
of the capture, and run `node scripts/figma-export/selftest.mjs` to dry-run the plugin.
