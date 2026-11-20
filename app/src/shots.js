// Fixed scenes for screenshots: ?shot=editor shows the page with the sample
// photo loaded in every panel; ?shot=cover shows the cover alone at the
// requested size; ?shot=export runs the app's real export and shows the PNG
// it wrote, scaled to fit. window.__shotReady is set once painted, and
// window.__exportDataUrl carries the exported PNG for the export scene.

import { paintSampleScene } from './sample.js';

/**
 * Sets up a shot. `query` is the page's search params, `apply` fills the
 * editor state and redraws, `exportPng` runs the real export at w x h and
 * resolves to a data URL.
 */
export async function runShot(shot, query, apply, exportPng) {
  const caption = query.get('caption') ?? 'Vice City Nights';
  const kicker = query.get('kicker') ?? 'A fan-made cover';
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const sample = paintSampleScene(1200, 900);

  if (shot === 'export') {
    const w = Number(query.get('w') ?? 1920);
    const h = Number(query.get('h') ?? 1080);
    const dataUrl = await exportPng({ layout, grade, caption, kicker, sample, w, h });
    const img = document.createElement('img');
    img.id = 'exported';
    img.src = dataUrl;
    img.alt = 'The exported cover PNG';
    document.body.classList.add('shot-export');
    document.body.appendChild(img);
    window.__exportDataUrl = dataUrl;
  } else {
    if (shot === 'cover') document.body.classList.add('shot-cover');
    await apply({ layout, grade, caption, kicker, sample });
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
