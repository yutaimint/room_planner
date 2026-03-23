# 間取りプランナー — Room Layout Simulator

An interactive room planning tool with drag-and-drop furniture placement, built with React + Vite.

## Features

- **Room sizing** — Input width/depth in cm, auto-calculates m² and 畳 (tatami)
- **Preset furniture** — One-click add common Japanese furniture (ベッド, デスク, ソファ, etc.)
- **Custom furniture** — Name, dimensions, and color picker
- **Drag & drop** — Place and reposition furniture freely (mouse + touch)
- **Rotation** — Rotate the entire room (0°/90°/180°/270°) or individual items
- **Blueprint grid** — Adaptive grid with dimension labels

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build for Production

```bash
npm run build
```

The output will be in the `dist/` folder.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → "Add New Project"
3. Import the GitHub repo
4. Framework: **Vite** (auto-detected)
5. Click **Deploy**

## Deploy to GitHub Pages

1. Install gh-pages: `npm install -D gh-pages`
2. Add to `package.json` scripts: `"deploy": "npm run build && gh-pages -d dist"`
3. Run: `npm run deploy`

## License

MIT
