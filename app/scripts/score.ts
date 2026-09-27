#!/usr/bin/env bun
/** Original instrumental score + editorial timing. No sampled or upstream audio. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { STORY, DURATION } from '../src/hope/story';

const root = path.resolve(import.meta.dir, '../..');
const RATE = 44100, N = Math.round(DURATION * RATE);
const left = new Float32Array(N), right = new Float32Array(N);
let seed = 91427;
function noise() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; }
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
function note(start: number, midi: number, duration: number, amp: number, pan = 0, pad = false) {
  const freq = hz(midi), count = Math.min(Math.ceil(duration * RATE), N - Math.floor(start * RATE));
  const begin = Math.floor(start * RATE), l = Math.sqrt((1 - pan) / 2), r = Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < count; i++) {
    const t = i / RATE, end = Math.min(1, (duration - t) / .18);
    const env = pad ? Math.min(1, t / .7) * Math.min(1, (duration - t) / 1.1) : (1 - Math.exp(-t * 140)) * Math.exp(-t * 2.3);
    const fundamental = Math.sin(Math.PI * 2 * freq * t);
    const v = amp * env * end * (pad
      ? .55 * fundamental + .25 * Math.sin(Math.PI * 2 * freq * 1.002 * t) + .12 * Math.sin(Math.PI * 4 * freq * t)
      : .72 * fundamental + .18 * Math.sin(Math.PI * 4 * freq * t) * Math.exp(-t * 3) + .1 * Math.sin(Math.PI * 2 * freq * 3.005 * t) * Math.exp(-t * 5));
    left[begin + i]! += v * l; right[begin + i]! += v * r;
  }
}
function drum(start: number, kind: 'kick' | 'hat' | 'snare', amp: number) {
  const duration = kind === 'kick' ? .35 : kind === 'snare' ? .2 : .065;
  for (let i = 0; i < duration * RATE; i++) {
    const index = Math.floor(start * RATE) + i; if (index >= N) break;
    const t = i / RATE, n = noise();
    const v = amp * (kind === 'kick'
      ? Math.sin(Math.PI * 2 * (48 * t + 4.2 * (1 - Math.exp(-t * 30)))) * Math.exp(-t * 17)
      : kind === 'snare' ? (.65 * n + .35 * Math.sin(Math.PI * 360 * t)) * Math.exp(-t * 29)
      : n * Math.exp(-t * 85) * Math.sin(Math.PI * 14500 * t));
    left[index]! += v * .71; right[index]! += v * .71;
  }
}
const minor = [[50, 57, 62, 65], [46, 53, 58, 62], [53, 60, 65, 69], [48, 55, 60, 64]];
const major = [[53, 60, 65, 69], [48, 55, 60, 67], [46, 53, 58, 65], [53, 60, 65, 69]];
const melody = [74, 72, 69, 65, 67, 69, 72, 69, 77, 76, 72, 69, 70, 69, 67, 65];
for (let bar = 0; bar < 36; bar++) {
  const t = bar * 2, chapter = Math.floor(bar / 4);
  const chord = (chapter < 5 ? minor : major)[bar % 4]!;
  const quiet = chapter === 3, final = chapter === 8;
  if (!quiet) chord.forEach((m, i) => note(t, m, 3.8, chapter < 4 ? .07 : .11, (i - 1.5) * .24, true));
  if (quiet) { if (bar % 2 === 0) note(t + .5, 65 + (bar % 3) * 2, 3.5, .15, -.2); continue; }
  const steps = chapter === 0 || final ? 3 : chapter >= 5 ? 8 : 4;
  for (let s = 0; s < steps; s++) {
    const midi = chord[(s + bar) % 4]! + 12;
    note(t + s * 2 / steps, midi, 2.3, .115, Math.sin(bar + s) * .4);
  }
  if (chapter >= 4) {
    note(t + .25, melody[(bar - 16) % 16]!, 2.4, .13, .12);
    if (chapter > 4 && !final) note(t + 1.25, melody[(bar - 15) % 16]!, 1.6, .09, -.18);
  }
  if ([1, 2, 5, 6, 7].includes(chapter)) {
    const energy = chapter > 4 ? .24 : .105;
    for (let beat = 0; beat < 4; beat++) {
      if (chapter !== 2 || beat % 2 === 0) drum(t + beat * .5, beat % 2 ? 'snare' : 'kick', beat % 2 ? energy * .35 : energy);
      if (chapter >= 5) { drum(t + beat * .5 + .25, 'hat', .04); note(t + beat * .5, chord[0]! - 12, .45, .085, 0); }
    }
  }
}
// Opening motif, falling response, last warm chord.
[74, 77, 81].forEach((m, i) => note(1 + i * .75, m, 3, .12, -.2 + i * .2));
[77, 74, 72, 69, 65, 62].forEach((m, i) => note(17 + i * .45, m, 2.7, .12, .25));
[53, 60, 65, 69, 77].forEach((m, i) => note(68 + i * .05, m, 4 - i * .05, .1, (i - 2) * .18, true));
// Stereo echo/reverb, fixed coefficients and fixed seed make regeneration repeatable.
for (const [delay, gain] of [[.173, .2], [.337, .17], [.509, .12]] as const) {
  const d = Math.floor(delay * RATE);
  for (let i = d; i < N; i++) {
    const a = left[i - d]!, b = right[i - d]!;
    left[i]! += b * gain; right[i]! += a * gain;
  }
}
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / RATE, fade = Math.min(1, t / .5, (DURATION - t) / 2);
  left[i]! *= fade; right[i]! *= fade;
  peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
}
const pcm = Buffer.alloc(44 + N * 4), gain = .86 / Math.max(.1, peak);
pcm.write('RIFF', 0); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22); pcm.writeUInt32LE(RATE, 24); pcm.writeUInt32LE(RATE * 4, 28);
pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { pcm.writeInt16LE(Math.round(left[i]! * gain * 32767), 44 + i * 4); pcm.writeInt16LE(Math.round(right[i]! * gain * 32767), 46 + i * 4); }
mkdirSync(path.join(root, 'out'), { recursive: true });
const wav = path.join(root, 'out/still-becoming.wav'); writeFileSync(wav, pcm);
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const processAudio = Bun.spawn([ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '192k', path.join(root, 'audio/still-becoming.mp3')], { stdout: 'inherit', stderr: 'inherit' });
if (await processAudio.exited !== 0) throw new Error('Score encoding failed');
const features: Record<string, number[]> = { rms: [] };
for (let f = 0; f <= DURATION * 100; f++) {
  let sum = 0, count = 0;
  for (let i = f * 441; i < Math.min(N, (f + 1) * 441); i++) { sum += (left[i]! ** 2 + right[i]! ** 2) * .5 * gain ** 2; count++; }
  features.rms!.push(count ? Math.sqrt(sum / count) : 0);
}
const sections = STORY.map((s, i) => ({ name: s.id, start: i * 8, end: (i + 1) * 8 }));
writeFileSync(path.join(root, 'data/hope-audio.json'), JSON.stringify({ duration: DURATION, bpm: 120, fps: 100, beats: Array.from({ length: 145 }, (_, i) => i * .5), downbeats: Array.from({ length: 37 }, (_, i) => i * 2), sections, features, onsets: {} }));
writeFileSync(path.join(root, 'data/hope-text.json'), JSON.stringify({ lines: STORY.map((s, i) => ({ text: s.cn, start: i * 8, end: (i + 1) * 8, words: [{ w: s.cn, start: i * 8, end: (i + 1) * 8 }] })) }, null, 2));
console.log(`Original score: ${DURATION}s, stereo, peak normalized to -1.31 dBFS. Timing data written.`);
