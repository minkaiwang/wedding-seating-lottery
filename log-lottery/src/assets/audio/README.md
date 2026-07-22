# Generated audio assets

The audio files in this directory are generated specifically for this
repository from mathematical sine waves, envelopes, delays, and mixing. The
generator reads no recorded performance, music sample, or other external media.

Run the maintenance command from `log-lottery/`:

```bash
npm run audio:generate
```

This invokes `scripts/generate-synthetic-audio.mjs` and requires FFmpeg on the
maintainer's `PATH` (or `FFMPEG_PATH` pointing to the executable). The checked-in
inventory below was generated with FFmpeg `8.1.2-full_build-www.gyan.dev`.
Audio generation is intentionally not part of install or build.

| File | Purpose | Nominal duration | Format |
|------|---------|------------------|--------|
| `worldcup.mp3` | Seamless-ish draw loop; legacy filename retained for import compatibility | 16.00 s | 48 kHz stereo MP3, 160 kbps |
| `end.mp3` | Single lottery-finish cue | 1.10 s | 48 kHz stereo MP3, 160 kbps |
| `enter.mp3` | Short winner chime designed for limited concurrent playback | 0.82 s | 48 kHz stereo MP3, 160 kbps |
| `enter.wav` | Lossless PCM counterpart/source record for the winner chime | 0.82 s | 48 kHz, 16-bit stereo PCM |

The exact SHA-256 inventory for the checked-in outputs is recorded below after
generation. FFmpeg encoder versions can produce byte-level differences while
preserving the documented waveform and duration.

<!-- AUDIO_SHA256_START -->
- `enter.wav`: `5ed16e53253d0ba41820ba2b3b1c4107033a2a50b5a7f4c63cb5b9f8b6d5d0d8`
- `enter.mp3`: `c6bb826d36743f43d6470a9430f04902d9674d1167a25439631329ce65545d16`
- `end.mp3`: `abcb6b5be73b9eda32feb337aa43ed45e5a68db0a8d19b920420604e4b1e8f68`
- `worldcup.mp3`: `1e7d0bc403092de2ee56801139b099eb47e638b5d199e5da437736381e078178`
<!-- AUDIO_SHA256_END -->

The generator source is covered by the root MIT License. To the extent that
copyright or related rights apply to the generated output and are controlled by
this project's contributors, the checked-in audio is offered under the same
license. This statement does not cover user-uploaded media or audio retained in
earlier Git history.
