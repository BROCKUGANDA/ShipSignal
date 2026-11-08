# Demo Video — Final Script & Beat Map (3:04)

Voice: Kokoro `am_adam` (US male, natural), speed 0.96. Total narration 178s + gaps = 184s. Loudness −15.4 LUFS (YouTube-safe).

| Time | Scene | Narration (verbatim) |
|---|---|---|
| 0:00–0:20 | 01 Hook | Engineering teams do not fail releases because of one bug… ShipSignal brings all of that evidence together, so you can see the real readiness of a release before you ship it. |
| 0:21–0:39 | 02 Intro | This is ShipSignal, evidence-driven release intelligence for Atlassian… Is this release ready, and how do we know? |
| 0:41–1:06 | 03 Architecture | Under the hood, ShipSignal uses TypeScript… AI only explains the evidence. It never invents it. |
| 1:08–1:29 | 04 Product | Here is the product… with its source, its timestamp, and its freshness. |
| 1:31–1:56 | 05 Risk | The risk engine scores releases from documented rules… never fabricated ones. |
| 1:57–2:21 | 06 Agent+MCP | ShipSignal also ships as an agent… explicit confirmation. |
| 2:23–2:52 | 07 Security | Security and resilience are built in… clearly labeled. |
| 2:54–3:04 | 08 Close | ShipSignal makes release decisions more informed… see the evidence for yourself. |

## Production pipeline
1. Narration: `npx hyperframes tts scripts/NN_*.txt -v am_adam -s 0.96` → `assets/voice/*.wav`
2. Film: HyperFrames composition `demo-video/index.html` (1920×1080, 30fps, GSAP timeline, scene starts aligned to TTS durations + 0.7s gaps)
3. Render: `npx hyperframes render --quality delivery --output demo-final.mp4` (ffmpeg encode)
4. Loudness: `ffmpeg -af loudnorm=I=-14:TP=-1.5:LRA=11` (input measured −15.4 LUFS)
5. Upload to YouTube (public), paste URL into `docs/DEVPOST_SUBMISSION.md`

Frames for Devpost screenshots: `demo-video/.hyperframes/artifacts/snapshots/*/contact-sheet.jpg`
