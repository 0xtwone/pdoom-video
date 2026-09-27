/** Editorial source of truth. Nine four-bar movements at 120 BPM. */
export const STORY = [
  { id: 'spark', label: '微光', top: 'STILL', bottom: 'BECOMING.', cn: '再次，成为自己。', note: 'A SMALL LIFE. AN UNFINISHED STORY.' },
  { id: 'again', label: '碰壁', top: 'AGAIN.', bottom: 'AND AGAIN.', cn: '她努力过。也一次次，没能如愿。', note: 'SOME DOORS NEVER OPENED.' },
  { id: 'fall', label: '失重', top: 'THEN', bottom: 'SILENCE.', cn: '后来，连往前走的力气也没有了。', note: 'WHEN THE OLD MAP FALLS APART.' },
  { id: 'rest', label: '停下来', top: 'I CAN', bottom: 'REST HERE.', cn: '这一刻，她允许自己停下来。', note: 'NOT EVERY MOMENT NEEDS A WAY FORWARD.' },
  { id: 'self', label: '认出自己', top: 'STILL', bottom: 'ME.', cn: '那些失去，并不是她的全部。', note: 'MORE THAN WHAT HAPPENED TO ME.' },
  { id: 'mend', label: '重建', top: 'PIECE', bottom: 'BY PIECE.', cn: '一点一点，她把生活接回自己手里。', note: 'SMALL THINGS. CHOSEN AGAIN.' },
  { id: 'path', label: '自己的路', top: 'MY OWN', bottom: 'WAY.', cn: '这一次，方向由她自己决定。', note: 'NO NEED TO FOLLOW THE OLD MAP.' },
  { id: 'bloom', label: '生长', top: 'SOFT', bottom: 'IS STRONG.', cn: '她依然柔软，也有了继续生长的力量。', note: 'THERE IS ROOM TO GROW.' },
  { id: 'dawn', label: '向光', top: 'I BEGIN', bottom: 'AGAIN.', cn: '未来还很长。她带着自己，走向光。', note: 'THE STORY IS STILL HERS TO WRITE.' },
] as const;
export const CHAPTER_SECONDS = 8;
export const DURATION = STORY.length * CHAPTER_SECONDS;
