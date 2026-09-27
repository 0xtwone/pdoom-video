/** Browser-hosted export fallback for environments that cannot launch headless Chrome. */
export async function captureJob(api: any, jobUrl: string) {
  const url = new URL(jobUrl);
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Capture jobs must be local');
  const job = await (await fetch(url)).json();
  const status = document.createElement('div');
  status.style.cssText = 'position:fixed;bottom:12px;left:12px;padding:8px 14px;background:#151517;color:#eee9df;font:14px monospace;z-index:99';
  status.setAttribute('role', 'status'); document.body.append(status);
  try {
    if (api.errors.length) throw new Error(api.errors.join('\n'));
    if (job.mode === 'sheet') {
      const cols = job.cols ?? 3, w = 640, h = 360, gap = 8, label = 24;
      const canvas = document.createElement('canvas');
      canvas.width = cols * (w + gap) + gap; canvas.height = Math.ceil(job.times.length / cols) * (h + gap + label) + gap;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#151517'; c.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < job.times.length; i++) {
        api.still(job.times[i]);
        const x = gap + (i % cols) * (w + gap), y = gap + Math.floor(i / cols) * (h + gap + label);
        c.drawImage(document.getElementById('c') as HTMLCanvasElement, x, y + label, w, h);
        c.fillStyle = '#eee9df'; c.font = '14px monospace'; c.fillText(`${job.times[i].toFixed(2)}s`, x + 5, y + 17);
        status.textContent = `画面检查 ${i + 1} / ${job.times.length}`;
        await new Promise(r => setTimeout(r, 0));
      }
      const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/png'));
      const response = await fetch(`${jobUrl}/result`, { method: 'POST', body: blob });
      if (!response.ok) throw new Error('Unable to save contact sheet');
    } else if (job.mode === 'video') {
      status.textContent = '正在导出影片，请保留此页面…';
      await api.stream({ from: job.from, to: job.to, fps: job.fps, ws: jobUrl.replace('http:', 'ws:') + '/stream', samples: job.samples, shutter: .2, inflight: 3 });
      const response = await fetch(`${jobUrl}/done`, { method: 'POST' });
      if (!response.ok) throw new Error(await response.text());
    }
    status.textContent = '导出完成';
  } catch (error) {
    status.textContent = `导出失败：${error}`;
    await fetch(`${jobUrl}/error`, { method: 'POST', body: String(error) });
    throw error;
  }
}
