// Draws a GTA-style multi-panel cover onto a canvas: panel layouts, per-panel
// photos with crop and position, a sunset or neon colour grade, and bold
// caption lettering with an outline and a warm gradient fill. The same
// function draws the editor preview and the exported PNG, so what the user
// sees is exactly what they share.

export const LAYOUTS = {
  hero: 'Hero split — one big panel, two stacked beside it',
  triple: 'Triple strip — three tall panels side by side',
  grid: 'Cover grid — one wide panel on top, two below it',
};

export const GRADES = {
  sunset: 'Sunset — warm orange and magenta',
  neon: 'Neon nights — teal shadows, hot pink lights',
  noir: 'Noir — high-contrast black and white',
  palm: 'Palm fade — soft, bleached, late afternoon',
};

/** Panel rectangles for `layout`, in fractions of the cover (minus the caption band). */
export function layoutRects(layout, w, h) {
  const band = Math.round(h * 0.17);
  const top = 0;
  const bottom = h - band;
  const gap = Math.round(w * 0.012);
  if (layout === 'triple') {
    const pw = (w - gap * 2) / 3;
    return [
      { x: 0, y: top, w: pw, h: bottom - top },
      { x: pw + gap, y: top, w: pw, h: bottom - top },
      { x: (pw + gap) * 2, y: top, w: pw, h: bottom - top },
    ];
  }
  if (layout === 'grid') {
    const mid = top + (bottom - top) * 0.58;
    const pw = (w - gap) / 2;
    return [
      { x: 0, y: top, w, h: mid - top - gap / 2 },
      { x: 0, y: mid + gap / 2, w: pw, h: bottom - (mid + gap / 2) },
      { x: pw + gap, y: mid + gap / 2, w: pw, h: bottom - (mid + gap / 2) },
    ];
  }
  // hero
  const heroW = w * 0.62;
  const rightH = (bottom - top - gap) / 2;
  return [
    { x: 0, y: top, w: heroW, h: bottom - top },
    { x: heroW + gap, y: top, w: w - heroW - gap, h: rightH },
    { x: heroW + gap, y: top + rightH + gap, w: w - heroW - gap, h: rightH },
  ];
}

/** The colour grade for one panel, as a canvas filter string plus overlays. */
function gradeStyle(grade) {
  if (grade === 'neon') {
    return {
      filter: 'saturate(1.55) contrast(1.18) hue-rotate(-12deg)',
      overlays: [
        { kind: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(0, 229, 255, 0.10)'], [1, 'rgba(255, 0, 128, 0.22)']] },
      ],
    };
  }
  if (grade === 'noir') {
    return {
      filter: 'grayscale(1) contrast(1.35) brightness(1.05)',
      overlays: [
        { kind: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,255,255,0.06)'], [1, 'rgba(0,0,0,0.28)']] },
      ],
    };
  }
  if (grade === 'palm') {
    return {
      filter: 'saturate(0.9) contrast(0.92) brightness(1.12) sepia(0.25)',
      overlays: [
        { kind: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255, 240, 200, 0.10)'], [1, 'rgba(255, 180, 90, 0.12)']] },
      ],
    };
  }
  return {
    filter: 'saturate(1.35) contrast(1.12)',
    overlays: [
      { kind: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255, 140, 40, 0.05)'], [1, 'rgba(200, 30, 110, 0.28)']] },
    ],
  };
}

function paintOverlay(ctx, rect, overlay) {
  const g = ctx.createLinearGradient(
    rect.x + overlay.from[0] * rect.w,
    rect.y + overlay.from[1] * rect.h,
    rect.x + overlay.to[0] * rect.w,
    rect.y + overlay.to[1] * rect.h,
  );
  for (const [at, color] of overlay.stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/**
 * Draws the cover. `state` is { layout, grade, title, subtitle, kicker,
 * panels: [{ image, zoom, panX, panY }] } where a panel image is a canvas or
 * an <img>, or null for an empty panel. `selected` is the index of the panel
 * the editor has picked, or -1; a picked panel gets a highlight frame.
 */
export function drawCoverArt(canvas, state, selected = -1) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const band = Math.round(h * 0.17);

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  const rects = layoutRects(state.layout, w, h);
  const grade = gradeStyle(state.grade);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || {};
    ctx.save();
    // Rounded panel with a white gutter border.
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, Math.max(4, w * 0.008));
    ctx.clip();
    if (panel.image) {
      const iw = panel.image.naturalWidth || panel.image.width;
      const ih = panel.image.naturalHeight || panel.image.height;
      const zoom = panel.zoom || 1;
      const base = Math.max(rect.w / iw, rect.h / ih) * zoom;
      const pw = iw * base;
      const ph = ih * base;
      const cx = rect.x + rect.w / 2 + (panel.panX || 0) * rect.w;
      const cy = rect.y + rect.h / 2 + (panel.panY || 0) * rect.h;
      ctx.filter = grade.filter;
      ctx.drawImage(panel.image, cx - pw / 2, cy - ph / 2, pw, ph);
      ctx.filter = 'none';
    } else {
      // Empty panel: a dark violet fill with a faint sun, so the layout reads
      // even before a photo is dropped in.
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      g.addColorStop(0, '#3a1a5e');
      g.addColorStop(1, '#12081f');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255, 180, 90, 0.5)';
      ctx.beginPath();
      ctx.arc(rect.x + rect.w / 2, rect.y + rect.h * 0.62, rect.w * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const overlay of grade.overlays) paintOverlay(ctx, rect, overlay);
    // A soft shade at the foot of each panel keeps the gutters crisp.
    const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.7, 0, rect.y + rect.h);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();

    // White frame and, for the picked panel, a hot-pink highlight.
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, Math.max(4, w * 0.008));
    ctx.stroke();
    if (i === selected) {
      ctx.lineWidth = Math.max(3, w * 0.006);
      ctx.strokeStyle = '#ff2e88';
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, Math.max(4, w * 0.008));
      ctx.stroke();
    }
  });

  // Caption band: a dark strip with a sunset edge, then the lettering.
  const bandY = h - band;
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, h);
  bandGrad.addColorStop(0, '#1b0b2e');
  bandGrad.addColorStop(1, '#0a0512');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandY, w, band);
  ctx.fillStyle = '#ff7a3c';
  ctx.fillRect(0, bandY, w, Math.max(3, h * 0.006));

  const pad = w * 0.035;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const kicker = (state.kicker || '').trim().toUpperCase();

  if (kicker) {
    // Shrink the kicker until it fits the cover, like the title below: a
    // 40-character kicker at full size runs off the right edge.
    let ks = Math.max(10, band * 0.16);
    const kickerFace = 'system-ui, sans-serif';
    ctx.font = `800 ${ks}px ${kickerFace}`;
    ctx.letterSpacing = `${Math.round(ks * 0.28)}px`;
    while (ctx.measureText(kicker).width > w - pad * 2 && ks > 10) {
      ks -= 1;
      ctx.font = `800 ${ks}px ${kickerFace}`;
      ctx.letterSpacing = `${Math.round(ks * 0.28)}px`;
    }
    ctx.fillStyle = '#ff5fa2';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(kicker, pad, bandY + band * 0.26);
    ctx.letterSpacing = '0px';
  }
  if (title) {
    let size = band * (kicker ? 0.42 : 0.52);
    const face = `"Arial Black", "Helvetica Neue", system-ui, sans-serif`;
    ctx.font = `900 ${size}px ${face}`;
    while (ctx.measureText(title).width > w - pad * 2 && size > 12) {
      size -= 2;
      ctx.font = `900 ${size}px ${face}`;
    }
    const ty = bandY + band * (kicker ? 0.78 : 0.66);
    const grad = ctx.createLinearGradient(0, ty - size, 0, ty);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#ffe9a8');
    grad.addColorStop(1, '#ff9a3c');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = '#14082a';
    ctx.strokeText(title, pad, ty);
    ctx.fillStyle = grad;
    ctx.fillText(title, pad, ty);
  }
  if (subtitle) {
    const ss = Math.max(10, band * 0.15);
    ctx.font = `600 ${ss}px system-ui, sans-serif`;
    ctx.fillStyle = '#d8cfe8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(subtitle, w - pad, bandY + band * 0.82);
  }
  ctx.restore();
}

/** The export sizes the app offers, as [label, width, height]. */
export const EXPORT_SIZES = [
  ['Square 1080 x 1080', 1080, 1080],
  ['Portrait 1080 x 1350', 1080, 1350],
  ['Wide 1920 x 1080', 1920, 1080],
];
