# GIF recipe (manual)

1. `node bin/turbometro.js --demo --out metro.html`
2. Open `metro.html` in a browser (Chrome works well with `offset-path`).
3. Record 3–5s of the moving trains (QuickTime / Kap / OBS).
4. Convert if needed:

```bash
ffmpeg -i recording.mov -vf "fps=15,scale=960:-1:flags=lanczos" -loop 0 docs/demo.gif
```

5. Embed in README: `![turbometro demo](docs/demo.gif)`
