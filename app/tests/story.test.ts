import { describe, expect, test } from 'bun:test';
import { STORY, DURATION, CHAPTER_SECONDS } from '../src/hope/story';
import { makeHopeTimeline } from '../src/hope/timeline';
import { AudioData } from '../src/engine/audio';
import { Lyrics } from '../src/engine/lyrics';
import audio from '../../data/hope-audio.json';
import text from '../../data/hope-text.json';

describe('the story, score and export use one edit', () => {
  test('all moments are covered exactly once, including either side of every cut', () => {
    const timeline = makeHopeTimeline();
    expect(timeline[0]!.start).toBe(0);
    expect(timeline.at(-1)!.end).toBe(DURATION);
    expect(new Set(timeline.map(e => e.id)).size).toBe(STORY.length);
    for (let t = 0; t < DURATION; t += 1 / 30) expect(timeline.filter(e => t >= e.start && t < e.end)).toHaveLength(1);
    for (let i = 1; i < timeline.length; i++) expect(timeline[i - 1]!.end).toBe(timeline[i]!.start);
  });
  test('committed score and text match the edited story rather than upstream lyrics', () => {
    const au = new AudioData(audio), ly = new Lyrics(text);
    expect(au.duration).toBe(DURATION);
    expect(au.bpm).toBe(120);
    expect(ly.lines).toHaveLength(STORY.length);
    STORY.forEach((s, i) => {
      expect(ly.lineAt(i * CHAPTER_SECONDS + 1)?.text).toBe(s.cn);
      expect(au.section(i * CHAPTER_SECONDS + 1)?.name).toBe(s.id);
      expect(au.beatAt(i * CHAPTER_SECONDS) % 16).toBe(0);
    });
    expect(ly.findWords('P(doom)')).toHaveLength(0);
  });
  test('the generated audio envelopes are finite and normalized', () => {
    expect(audio.features.rms).toHaveLength(DURATION * 100 + 1);
    expect(audio.features.rms.some(n => n > .01)).toBe(true);
    expect(audio.features.rms.every(n => Number.isFinite(n) && n >= 0 && n <= 1)).toBe(true);
  });
});
