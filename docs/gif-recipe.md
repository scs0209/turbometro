# GIF recipe

## Automated (used for `docs/demo.gif`)

```bash
npm run build
node bin/turbometro.js --demo --out metro.html
python3 -m http.server 4177 --directory .
# then from a scratch dir with playwright:
# open http://127.0.0.1:4177/metro.html?capture=1
# call window.__turbometro.spawn(...) and screenshot frames
ffmpeg -framerate 10 -i frames/f%03d.png \
  -vf "fps=10,scale=1100:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse" \
  -loop 0 docs/demo.gif
```

`?capture=1` exposes `window.__turbometro` for headless recording.

## Manual

1. `node bin/turbometro.js --demo --out metro.html`
2. Serve over HTTP and open in Chrome
3. Click a station; record 4–6s (Kap / OBS / QuickTime)
4. Convert:

```bash
ffmpeg -i recording.mov -vf "fps=12,scale=960:-1:flags=lanczos" -loop 0 docs/demo.gif
```

5. Embed: `![turbometro demo](docs/demo.gif)`
