import type { TimelineEntry } from '../engine/engine';
import { STORY, CHAPTER_SECONDS } from './story';

export function makeHopeTimeline(): TimelineEntry[] {
  return STORY.map((s, i) => ({
    id: s.id, start: i * CHAPTER_SECONDS, end: (i + 1) * CHAPTER_SECONDS,
    load: () => import('./journey'), params: { chapter: i },
  }));
}
