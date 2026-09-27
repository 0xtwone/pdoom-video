# Still Becoming / 再次，成为自己

A 72-second, 16:9 animated short about a girl finding herself after repeated setbacks. A small pixel rabbit in an orange scarf stands in for her. She is allowed to pause, recognizes herself beyond what happened, rebuilds a path of her own, and walks toward a warmer future. Pixel birds enter as quiet companions.

## Visual treatment

Retains mexicat's ink/bone/orange palette, Archivo typography, IBM Plex Mono annotation, technical grids, perspective tunnels, sparks, bloom, halation, grain, deterministic timeline and offline export engine. The rabbit, birds, flowers, all nine scenes, bilingual screen text and instrumental score are new. No upstream song or lyrics are used in the new film. This is an adaptation, not a claim that the original author made or endorsed this film.

| Time | Movement | Action |
| --- | --- | --- |
| 00–08 | 微光 / Still becoming | A rabbit resolves from scattered pixels inside orbital rings. |
| 08–16 | 碰壁 / Again and again | Repeated attempts before closed doors; fading ghosts retain the effort. |
| 16–24 | 失重 / Then silence | The old grid becomes a rotating tunnel; she falls through it. |
| 24–32 | 停下来 / I can rest here | Movement and music recede. A warm point breathes beside her. |
| 32–40 | 认出自己 / Still me | Scattered pixels and broken contours settle around the same rabbit. |
| 40–48 | 重建 / Piece by piece | Small fragments assemble into stepping stones. |
| 48–56 | 自己的路 / My own way | An orange curve departs from the old route; a bird accompanies her. |
| 56–64 | 生长 / Soft is strong | Pixel plants bloom as the path opens up. |
| 64–72 | 向光 / I begin again | A pixel sun forms. She walks toward it, carrying herself forward. |

## Editing

- `app/src/hope/story.ts`: chapter order, screen text and duration (four 120 BPM bars per chapter).
- `app/src/hope/journey.ts`: time-addressable scenes and hand-drawn pixel characters.
- `app/src/hope/timeline.ts`: new edit; original `src/timeline.ts` is preserved.
- `app/scripts/score.ts`: deterministic original instrumental synthesis, measured RMS and timing data. Run again after changing the story. It uses no samples, voices, external music service, or original P(doom) track.
- Chinese is rendered using bundled Noto Sans SC (OFL), not an OS-specific font.
- Default preview plays the new film. `?film=original` restores the upstream film.

## Run

Install Bun 1.4 or later, Chrome, and ffmpeg with libx264/libmp3lame. In `app/`:

```sh
bun install --frozen-lockfile
bun run dev
bun run typecheck
bun run build
```

The Vite commands explicitly run through Bun so an older system Node does not break Vite. Preview is at the address printed by Vite. Click the image or Play, use Space to pause, arrow keys to seek, `[` / `]` to move between chapters, and `h` to hide controls. `?t=36` previews a particular moment.

## Render

```sh
# Original score is already committed; regenerate if you edit it.
bun run score
# New film: 1080p30 with four temporal samples.
bun run render
# Original film remains available explicitly.
bun scripts/render.ts video --film original --out ../out/original.mp4
# Higher temporal sampling / 60 fps, when desired.
bun scripts/render.ts video --fps 60 --samples 4 --shutter 0.2 --out ../out/still-becoming-60.mp4
```

`FFMPEG_PATH=/absolute/path/to/ffmpeg` can select a local ffmpeg binary. The delivered v1 is 1080p30 with one temporal sample per frame; it does not claim the upstream 4K/adaptive-sampling finish.

### Browser-hosted export

Some sandboxed environments cannot launch headless Chrome. The same engine can instead render through an already available browser:

```sh
# Terminal 1 (no hot reload while exporting)
PDOOM_NO_HMR=1 bun --bun vite --port 5317 --strictPort
# Terminal 2
bun scripts/capture-server.ts sheet --out ../out/storyboard.png
# Open the exact OPEN URL printed by the command.
# For video, use a different port or stop the sheet server:
bun scripts/capture-server.ts video --port 5321 --fps 30 --samples 1 --out ../out/still-becoming.mp4
```

Keep the browser tab open until it says export complete and the server prints SAVED. Frames stream through a loopback-only server with a random job token, ordered writes, bounded backpressure, exact frame-size/count checks and encoder exit checks. Output paths are fixed by the command; the page cannot choose a filesystem path. The browser CORS origin is intentionally restricted to `http://localhost:5317`. Stop the server with Ctrl-C after use.

The soundtrack is instrumental, with no recorded or generated vocal. The bilingual screen text is editorial timing, not speech recognition or lyric alignment. Scene changes occur at four-bar boundaries; the middle pause is deliberately sparse. Further polish can add more elaborate camera transitions and higher temporal sampling without changing the story.

## Credits and licenses

The rendering engine and upstream project are by mexicat / Giacomo Magnanini, under the original MIT license retained in `LICENSE`. Upstream font and music credits remain in `README-UPSTREAM.md`. New code, pixel art, text and synthesized score in this adaptation are offered under MIT as well. This does not change any upstream music or font license. Noto Sans SC is distributed under SIL OFL via `@fontsource/noto-sans-sc`.

## First-cut verification

- Application and export scripts typechecked; production build succeeded.
- Timeline, soundtrack metadata and bilingual story consistency: three automated tests passed.
- All nine chapter midpoint frames inspected; Chinese text rendered correctly.
- Browser preview play/pause and time progression verified.
- Full 2,160-frame MP4 decoded successfully: 1920×1080, 30 fps, exactly 72 seconds.
- Stereo AAC audio decoded through the ending; measured peak -1.6 dBFS, with no clipping.
- A separate 68–72 second render exercised the final export path after fixing early audio truncation.
- The repository includes a smaller 720p preview; the delivered local master is 1080p.
