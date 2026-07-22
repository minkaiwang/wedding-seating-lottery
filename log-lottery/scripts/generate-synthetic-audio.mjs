import { createHash } from 'node:crypto'
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const SAMPLE_RATE = 48000
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const outputDirectory = path.resolve(scriptDirectory, '../src/assets/audio')
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'wedding-lottery-audio-'))
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'

const commonMetadata = [
    '-map_metadata', '-1',
    '-metadata', 'artist=wedding-seating-lottery contributors',
    '-metadata', 'comment=Procedurally synthesized from mathematical tones; no external samples',
]

function runFfmpeg(args) {
    const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
        stdio: 'inherit',
        windowsHide: true,
    })
    if (result.error)
        throw result.error
    if (result.status !== 0)
        throw new Error(`FFmpeg exited with status ${result.status}`)
}

function toneInputs(tones) {
    return tones.flatMap(tone => [
        '-f', 'lavfi',
        '-i', `sine=frequency=${tone.frequency}:sample_rate=${SAMPLE_RATE}:duration=${tone.duration}`,
    ])
}

function toneFilter(tones, duration, echo = 'aecho=0.8:0.45:70|140:0.10|0.05') {
    const filters = tones.map((tone, index) => {
        const fadeOut = Math.max(0, tone.duration - tone.fadeDuration)
        const delay = tone.delay ? `,adelay=delays=${tone.delay}:all=1` : ''
        return `[${index}:a]volume=${tone.volume},afade=t=in:st=0:d=${tone.fadeIn},afade=t=out:st=${fadeOut}:d=${tone.fadeDuration}${delay}[tone${index}]`
    })
    const inputs = tones.map((_, index) => `[tone${index}]`).join('')
    filters.push(`${inputs}amix=inputs=${tones.length}:normalize=0:dropout_transition=0,${echo},alimiter=limit=0.82,atrim=duration=${duration},asetpts=N/SR/TB[out]`)
    return filters.join(';')
}

function render({ fileName, title, duration, tones, codec }) {
    const outputPath = path.join(temporaryDirectory, fileName)
    const codecArgs = codec === 'wav'
        ? ['-c:a', 'pcm_s16le']
        : ['-c:a', 'libmp3lame', '-b:a', '160k', '-id3v2_version', '3']

    runFfmpeg([
        ...toneInputs(tones),
        '-filter_complex', toneFilter(tones, duration),
        '-map', '[out]',
        '-ar', String(SAMPLE_RATE),
        '-ac', '2',
        ...codecArgs,
        ...commonMetadata,
        '-metadata', `title=${title}`,
        outputPath,
    ])
    return outputPath
}

const winnerTones = [
    { frequency: 659.255, duration: 0.72, delay: 0, volume: 0.55, fadeIn: 0.01, fadeDuration: 0.34 },
    { frequency: 783.991, duration: 0.72, delay: 35, volume: 0.50, fadeIn: 0.01, fadeDuration: 0.34 },
    { frequency: 1046.502, duration: 0.72, delay: 70, volume: 0.45, fadeIn: 0.01, fadeDuration: 0.34 },
]

const finishTones = [
    { frequency: 523.251, duration: 0.62, delay: 0, volume: 0.55, fadeIn: 0.01, fadeDuration: 0.25 },
    { frequency: 659.255, duration: 0.62, delay: 90, volume: 0.50, fadeIn: 0.01, fadeDuration: 0.25 },
    { frequency: 783.991, duration: 0.62, delay: 180, volume: 0.45, fadeIn: 0.01, fadeDuration: 0.25 },
    { frequency: 1046.502, duration: 0.76, delay: 270, volume: 0.42, fadeIn: 0.01, fadeDuration: 0.32 },
]

const chordProgression = [
    [261.626, 329.628, 391.995, 523.251],
    [220.000, 261.626, 329.628, 440.000],
    [174.614, 220.000, 261.626, 349.228],
    [195.998, 246.942, 293.665, 391.995],
]
const loopTones = chordProgression.flatMap((chord, chordIndex) => chord.map((frequency, voiceIndex) => ({
    frequency,
    duration: 4,
    delay: chordIndex * 4000,
    volume: [0.72, 0.58, 0.48, 0.38][voiceIndex],
    fadeIn: 0.10,
    fadeDuration: 0.35,
})))
const melody = [523.251, 659.255, 783.991, 659.255, 440.000, 523.251, 698.456, 659.255]
loopTones.push(...melody.map((frequency, index) => ({
    frequency,
    duration: 1.55,
    delay: index * 2000,
    volume: 0.34,
    fadeIn: 0.05,
    fadeDuration: 0.30,
})))

try {
    const generated = [
        render({ fileName: 'enter.wav', title: 'Winner chime (lossless source)', duration: 0.82, tones: winnerTones, codec: 'wav' }),
        render({ fileName: 'enter.mp3', title: 'Winner chime', duration: 0.82, tones: winnerTones, codec: 'mp3' }),
        render({ fileName: 'end.mp3', title: 'Lottery finish cue', duration: 1.10, tones: finishTones, codec: 'mp3' }),
        render({ fileName: 'worldcup.mp3', title: 'Lottery draw loop', duration: 16, tones: loopTones, codec: 'mp3' }),
    ]

    for (const temporaryPath of generated) {
        const fileName = path.basename(temporaryPath)
        const finalPath = path.join(outputDirectory, fileName)
        copyFileSync(temporaryPath, finalPath)
        const sha256 = createHash('sha256').update(readFileSync(finalPath)).digest('hex')
        console.log(`${fileName}  ${sha256}`)
    }
}
finally {
    rmSync(temporaryDirectory, { recursive: true, force: true })
}
