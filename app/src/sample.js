// Paints a procedural Vice City sunset street scene onto a canvas and hands it
// back as a photo the cover maker can use. Every pixel is drawn here by code:
// a gradient dusk sky, a low sun, a dark skyline with lit windows, palm
// silhouettes and a wet road with neon reflections. No photograph, no stock
// art, nothing borrowed — the app ships no picture files at all.

/** Draws the sample scene at `w` x `h` and returns the canvas. */
export function paintSampleScene(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');

  // Dusk sky: violet at the top, through magenta, down to a hot orange band.
  const sky = x.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, '#1b0f3b');
  sky.addColorStop(0.45, '#5b1a6e');
  sky.addColorStop(0.75, '#c22e6e');
  sky.addColorStop(1, '#ff7a3c');
  x.fillStyle = sky;
  x.fillRect(0, 0, w, h * 0.62);

  // Low sun with a warm halo.
  const sunX = w * 0.68;
  const sunY = h * 0.42;
  const sunR = h * 0.11;
  const halo = x.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.2);
  halo.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
  halo.addColorStop(0.4, 'rgba(255, 140, 90, 0.35)');
  halo.addColorStop(1, 'rgba(255, 140, 90, 0)');
  x.fillStyle = halo;
  x.fillRect(0, 0, w, h * 0.62);
  x.fillStyle = '#ffe9a8';
  x.beginPath();
  x.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  x.fill();

  // Skyline: a row of dark towers with a few lit windows.
  const base = h * 0.62;
  x.fillStyle = '#160a26';
  let bx = 0;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  while (bx < w) {
    const bw = w * (0.07 + rnd() * 0.09);
    const bh = h * (0.1 + rnd() * 0.2);
    x.fillRect(bx, base - bh, bw, bh);
    // Lit windows: a sparse grid of warm dots.
    x.fillStyle = '#ffd27a';
    for (let wy = base - bh + 8; wy < base - 8; wy += 14) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 12) {
        if (rnd() < 0.22) x.fillRect(wx, wy, 4, 6);
      }
    }
    x.fillStyle = '#160a26';
    bx += bw + w * 0.012;
  }

  // Palm silhouettes: curved trunks with drooping fronds, left and right.
  const palm = (px, py, s, lean) => {
    x.strokeStyle = '#12081f';
    x.lineWidth = Math.max(3, s * 0.03);
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + lean * s, py - s * 0.55, px + lean * s * 1.4, py - s);
    x.stroke();
    const tx = px + lean * s * 1.4;
    const ty = py - s;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * (0.08 + (i / 6) * 0.84) + (lean > 0 ? 0.35 : -0.35);
      const len = s * (0.34 + (i % 2) * 0.08);
      x.beginPath();
      x.moveTo(tx, ty);
      x.quadraticCurveTo(
        tx + Math.cos(a) * len * 0.6,
        ty + Math.sin(a) * len * 0.6 - s * 0.08,
        tx + Math.cos(a) * len,
        ty + Math.sin(a) * len + s * 0.1,
      );
      x.stroke();
    }
  };
  palm(w * 0.08, base + h * 0.02, h * 0.3, 1);
  palm(w * 0.94, base + h * 0.02, h * 0.26, -1);

  // Wet road: dark asphalt with a neon reflection of the sky.
  const road = x.createLinearGradient(0, base, 0, h);
  road.addColorStop(0, '#2a1230');
  road.addColorStop(0.25, '#1d0b24');
  road.addColorStop(1, '#0c0614');
  x.fillStyle = road;
  x.fillRect(0, base, w, h - base);
  const refl = x.createLinearGradient(0, base, 0, h);
  refl.addColorStop(0, 'rgba(255, 122, 60, 0.5)');
  refl.addColorStop(0.5, 'rgba(255, 60, 140, 0.22)');
  refl.addColorStop(1, 'rgba(255, 60, 140, 0)');
  x.fillStyle = refl;
  x.fillRect(w * 0.3, base, w * 0.45, (h - base) * 0.8);

  // A low car silhouette with headlights on the road.
  x.fillStyle = '#0a0512';
  const cy = h * 0.82;
  x.beginPath();
  x.moveTo(w * 0.36, cy);
  x.lineTo(w * 0.4, cy - h * 0.045);
  x.lineTo(w * 0.52, cy - h * 0.055);
  x.lineTo(w * 0.62, cy - h * 0.04);
  x.lineTo(w * 0.66, cy);
  x.closePath();
  x.fill();
  x.fillStyle = '#ffe9a8';
  x.beginPath();
  x.arc(w * 0.42, cy - h * 0.012, 3, 0, Math.PI * 2);
  x.arc(w * 0.6, cy - h * 0.012, 3, 0, Math.PI * 2);
  x.fill();

  return c;
}
