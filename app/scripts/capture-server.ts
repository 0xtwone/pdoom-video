#!/usr/bin/env bun
// Feed the same deterministic engine from any local browser, without a headless launch.
import path from 'node:path';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => { const i = args.indexOf('--' + name); return i < 0 ? fallback : args[i + 1]!; };
const mode = args[0] ?? 'sheet', root = path.resolve(import.meta.dir, '../..');
const out = path.resolve(opt('out', path.join(root, 'out', mode === 'sheet' ? 'storyboard.png' : 'still-becoming.mp4')));
mkdirSync(path.dirname(out), { recursive: true });
const from = +opt('from', '0'), to = +opt('to', '72'), fps = +opt('fps', '30');
const total = Math.round(to * fps) - Math.round(from * fps);
const token = crypto.randomUUID();
const job = { mode, from, to, fps, samples: +opt('samples', '2'), cols: +opt('cols', '3'), times: opt('times', '4,12,20,28,36,44,52,60,68').split(',').map(Number) };
let frames = 0, failed = '', chain = Promise.resolve();
const audio = path.join(root, 'audio/still-becoming.mp3');
const ff = mode === 'video' ? Bun.spawn([process.env.FFMPEG_PATH || 'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1920x1080', '-r', String(fps), '-i', 'pipe:0', '-ss', String(from), '-t', String(to - from), '-i', audio, '-vf', 'vflip', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', String(to - from), '-movflags', '+faststart', out], { stdin: 'pipe', stdout: 'inherit', stderr: 'inherit' }) : null;
const headers = { 'Access-Control-Allow-Origin': 'http://localhost:5317', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const reply = (text: string, status = 200) => new Response(text, { status, headers });
const server = Bun.serve({
  hostname: '127.0.0.1', port: +opt('port', '5320'), idleTimeout: 255,
  async fetch(req, srv) {
    const u = new URL(req.url); if (!u.pathname.startsWith('/' + token)) return reply('Not found', 404);
    if (req.method === 'OPTIONS') return reply('');
    const endpoint = u.pathname.slice(token.length + 1);
    if (endpoint === '/stream') return srv.upgrade(req) ? undefined : reply('Upgrade failed', 400);
    if (endpoint === '/result' && req.method === 'POST') { await Bun.write(out, await req.arrayBuffer()); console.log('SAVED ' + out); return reply('saved'); }
    if (endpoint === '/error') { failed = await req.text(); console.error(failed); ff?.kill(); return reply('error received'); }
    if (endpoint === '/done') {
      await chain;
      if (failed || frames !== total) { ff?.kill(); return reply(failed || `Expected ${total} frames, received ${frames}`, 500); }
      ff!.stdin.end(); const code = await ff!.exited;
      if (code !== 0) return reply(`Encoder exited ${code}`, 500);
      console.log('SAVED ' + out); return reply('saved');
    }
    if (endpoint === '') return Response.json(job, { headers });
    return reply('Not found', 404);
  },
  websocket: {
    maxPayloadLength: 1920 * 1080 * 4 + 1024,
    message(ws, msg) {
      // Serialize writes: Bun callbacks may overlap while stdin is applying backpressure.
      chain = chain.then(async () => {
        if (!ff || typeof msg === 'string' || msg.byteLength !== 1920 * 1080 * 4 || frames >= total) throw new Error('Invalid frame');
        ff.stdin.write(msg); await ff.stdin.flush(); frames++; ws.send(String(frames));
        if (frames % 120 === 0 || frames === total) console.log(`FRAMES ${frames}/${total}`);
      }).catch(error => { failed = String(error); console.error(failed); ws.close(); ff?.kill(); });
    },
  },
});
console.log(`OPEN http://localhost:5317/?export=1&job=${encodeURIComponent(`http://127.0.0.1:${server.port}/${token}`)}`);
