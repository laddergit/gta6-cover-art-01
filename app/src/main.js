// Wires the page: pick photos, choose a layout and a grade, write the
// caption, drag a panel to move its photo, export the cover as a PNG. A
// `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
// Photos are read on the machine and never leave it.

import { drawCoverArt, layoutRects, LAYOUTS, GRADES, EXPORT_SIZES } from './cover.js';
import { paintSampleScene } from './sample.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('preview');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const kickerInput = document.getElementById('kicker');
const sizeSelect = document.getElementById('size');
const layoutRow = document.getElementById('layout');
const gradeRow = document.getElementById('grade');
const zoomInput = document.getElementById('zoom');
const photoInput = document.getElementById('photo');

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'Vice City Nights',
  subtitle: 'Leonida, 2026',
  kicker: 'A fan-made cover',
  panels: [{ image: null, zoom: 1, panX: 0, panY: 0 }, { image: null, zoom: 1, panX: 0, panY: 0 }, { image: null, zoom: 1, panX: 0, panY: 0 }],
};
let selected = 0;
let sample = null;

function redraw() {
  drawCoverArt(canvas, state, selected);
  const panel = state.panels[selected];
  if (!panel) {
    // No panel picked (a cover shot): the panel controls stay as they are.
    document.getElementById('panel-name').textContent = 'No panel picked';
    return;
  }
  zoomInput.value = String(Math.round((panel.zoom || 1) * 100));
  document.getElementById('zoom-value').textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
  document.getElementById('panel-name').textContent = `Panel ${selected + 1} of 3`;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function useSample() {
  if (!sample) sample = paintSampleScene(1200, 900);
  return sample;
}

function fillPanelsWith(image) {
  for (const panel of state.panels) {
    panel.image = image;
    panel.zoom = 1;
    panel.panX = 0;
    panel.panY = 0;
  }
}

function buildButtons(row, entries, current, onPick) {
  row.innerHTML = '';
  for (const [value, label] of Object.entries(entries)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label.split(' — ')[0];
    b.title = label;
    b.className = value === current ? 'picked' : '';
    b.addEventListener('click', () => {
      onPick(value);
      buildButtons(row, entries, value, onPick);
      redraw();
    });
    row.appendChild(b);
  }
}

buildButtons(layoutRow, LAYOUTS, state.layout, (v) => { state.layout = v; });
buildButtons(gradeRow, GRADES, state.grade, (v) => { state.grade = v; });

for (const [label, w, h] of EXPORT_SIZES) {
  const opt = document.createElement('option');
  opt.value = `${w}x${h}`;
  opt.textContent = label;
  sizeSelect.appendChild(opt);
}
sizeSelect.value = '1920x1080';

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
kickerInput.addEventListener('input', () => { state.kicker = kickerInput.value; redraw(); });
zoomInput.addEventListener('input', () => {
  state.panels[selected].zoom = Number(zoomInput.value) / 100;
  redraw();
});

photoInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.panels[selected].image = await loadImage(URL.createObjectURL(file));
  state.panels[selected].zoom = 1;
  state.panels[selected].panX = 0;
  state.panels[selected].panY = 0;
  status.textContent = `Loaded ${file.name} into panel ${selected + 1}.`;
  redraw();
});

document.getElementById('sample').addEventListener('click', () => {
  fillPanelsWith(useSample());
  status.textContent = 'Sample photo loaded into all three panels. Drag a panel to move its photo.';
  redraw();
});

document.getElementById('clear').addEventListener('click', () => {
  fillPanelsWith(null);
  status.textContent = 'Panels cleared. Load a photo or use the sample.';
  redraw();
});

// Click a panel to pick it; drag the picked panel to move its photo.
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const px = (clientX - r.left) * (canvas.width / r.width);
  const py = (clientY - r.top) * (canvas.height / r.height);
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  return rects.findIndex((rc) => px >= rc.x && px <= rc.x + rc.w && py >= rc.y && py <= rc.y + rc.h);
}

let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i === -1) return;
  selected = i;
  dragging = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const panel = state.panels[selected];
  const r = canvas.getBoundingClientRect();
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  const rect = rects[selected];
  // A drag of dx screen pixels moves the photo by the same share of the
  // panel's width, so the photo follows the pointer.
  panel.panX += ((e.clientX - dragging.x) / r.width) * (canvas.width / rect.w);
  panel.panY += ((e.clientY - dragging.y) / r.height) * (canvas.height / rect.h);
  panel.panX = Math.max(-0.6, Math.min(0.6, panel.panX));
  panel.panY = Math.max(-0.6, Math.min(0.6, panel.panY));
  dragging = { x: e.clientX, y: e.clientY };
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });

/** Renders the cover offscreen at `w` x `h` and resolves to a PNG data URL. */
export function exportCover({ layout, grade, caption, kicker, sample: shotSample, w, h }) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const shotState = {
    layout,
    grade,
    title: caption,
    subtitle: state.subtitle,
    kicker,
    panels: [{ image: shotSample, zoom: 1.05, panX: 0, panY: 0 }, { image: shotSample, zoom: 1.3, panX: 0.12, panY: -0.05 }, { image: shotSample, zoom: 1.15, panX: -0.1, panY: 0.06 }],
  };
  drawCoverArt(off, shotState, -1);
  return Promise.resolve(off.toDataURL('image/png'));
}

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = sizeSelect.value.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCoverArt(off, state, -1);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved cover-${w}x${h}.png`;
  }, 'image/png');
});

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  // A cover shot is the art alone: no panel is picked, so no highlight frame
  // leaks into the exported cover.
  if (shot === 'cover') selected = -1;
  // A cover shot draws at the requested export size, so the screenshot shows
  // the cover at full resolution instead of a stretched preview.
  if (shot === 'cover') {
    canvas.width = Number(query.get('w') ?? 1920);
    canvas.height = Number(query.get('h') ?? 1080);
  }
  runShot(shot, query, async ({ layout, grade, caption, kicker, sample: shotSample }) => {
    state.layout = layout;
    state.grade = grade;
    state.title = caption;
    state.kicker = kicker;
    fillPanelsWith(shotSample);
    // Vary the crop per panel so the poster reads as three different shots.
    state.panels[0].zoom = 1.05;
    state.panels[1].zoom = 1.3;
    state.panels[1].panX = 0.12;
    state.panels[1].panY = -0.05;
    state.panels[2].zoom = 1.15;
    state.panels[2].panX = -0.1;
    state.panels[2].panY = 0.06;
    redraw();
  }, (opts) => exportCover(opts));
} else {
  redraw();
}
