// The schematic map (pass 03 section f): the platform-wall diagram, drawn
// from the PLAYER'S live network. Geometry follows the design mockup
// (Tunnelbana Schematic Map.html): a unit grid, thick round-capped lines
// over a bg-coloured casing so crossings read, station ticks, larger
// interchange rings, the hub's double ring, terminus labels in ink.
//
// Anchored stations use the pack's dia[x,y]. Free spots (and any anchor
// without one) take an affine geo-to-dia mapping, least-squares fitted to
// the anchors that have dia, or derived from the pack's diagram unit when
// fewer than two do (spec 01 §3.12); snapped to the half grid so they still
// read as diagram, not geography. Trains are a separate SVG layer the
// caller updates per frame; everything else rebuilds only when the
// network's shape changes. A ring draws closed.

import { CITY, ANCHORS, trainPos, linesAtAnchor, lineStripe, lineLetter } from './sim.js';

const U = 46;    // px per diagram unit
const PAD = 78;

// x = ax + bx * lon, y = ay + by * lat, fitted once.
const FIT = (() => {
  const pts = ANCHORS.filter((a) => a.dia);
  const ols = (xs, ys) => {
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
    const b = sxx > 0 ? sxy / sxx : 0;
    return [my - b * mx, b];
  };
  if (pts.length >= 2) {
    const [ax, bx] = ols(pts.map((a) => a.geo[1]), pts.map((a) => a.dia[0]));
    const [ay, by] = ols(pts.map((a) => a.geo[0]), pts.map((a) => a.dia[1]));
    return { ax, bx, ay, by };
  }
  const o = ANCHORS[(CITY.diagram && CITY.diagram.originAnchor) || 0].geo;
  const u = (CITY.diagram && CITY.diagram.unitKm) || 0.9;
  const bx = 111.32 * Math.cos(o[0] * Math.PI / 180) / u, by = -111.32 / u;
  return { ax: -o[1] * bx, bx, ay: -o[0] * by, by };
})();

function geoToDia(geo) {
  const x = FIT.ax + FIT.bx * geo[1];
  const y = FIT.ay + FIT.by * geo[0];
  return [Math.round(x * 2) / 2, Math.round(y * 2) / 2];
}

function diaOf(st) {
  return st.anchor !== null && ANCHORS[st.anchor].dia ? ANCHORS[st.anchor].dia : geoToDia(st.geo);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

// Layout for the current network: per-line point arrays plus the frame.
export function diagramLayout(g) {
  const linePts = g.lines.map((L) => L.stations.map(diaOf));
  const all = linePts.flat();
  if (!all.length) return null;
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  const X = (p) => PAD + (p[0] - minX) * U;
  const Y = (p) => PAD + (p[1] - minY) * U;
  return {
    linePts, X, Y,
    W: (maxX - minX) * U + PAD * 2,
    H: (maxY - minY) * U + PAD * 2,
    minX, maxX, minY, maxY,
  };
}

// The static SVG: everything except the trains, which live in #dia-trains.
export function diagramSVG(g) {
  const lay = diagramLayout(g);
  if (!lay) return '';
  const { linePts, X, Y, W, H, minX, maxX, minY, maxY } = lay;
  let out = '';

  // The paper: a faint unit grid.
  out += '<g>';
  for (let gx = Math.ceil(minX); gx <= maxX; gx++) {
    out += '<path d="M' + (PAD + (gx - minX) * U) + ' 0V' + H + '" stroke="var(--tb-dia-grid)" stroke-width="1"></path>';
  }
  for (let gy = Math.ceil(minY); gy <= maxY; gy++) {
    out += '<path d="M0 ' + (PAD + (gy - minY) * U) + 'H' + W + '" stroke="var(--tb-dia-grid)" stroke-width="1"></path>';
  }
  out += '</g>';

  // Lines: casing first (bg colour, wider), then the line, so crossings read.
  const pathOf = (pts, closed) => 'M' + pts.map((p) => X(p) + ' ' + Y(p)).join(' L ') + (closed ? ' Z' : '');
  for (const pass of ['casing', 'line', 'stripe']) {
    g.lines.forEach((L, li) => {
      if (linePts[li].length < 2) return;
      const stripe = lineStripe(L);
      if (pass === 'stripe' && !stripe) return;
      out += '<path d="' + pathOf(linePts[li], L.loop) + '" fill="none" ' +
        (pass === 'casing'
          ? 'stroke="var(--tb-dia-bg)" stroke-width="11"'
          : pass === 'line'
            ? 'stroke="' + L.color + '" stroke-width="7"'
            : 'stroke="' + stripe + '" stroke-width="2" stroke-dasharray="6 6"') +
        ' stroke-linecap="round" stroke-linejoin="round"></path>';
    });
  }

  // Nodes and labels, one per physical station (junction shares draw once).
  const seen = new Set();
  g.lines.forEach((L, li) => {
    L.stations.forEach((st, i) => {
      // Keyed by place, not name (0.13.1): a renamed junction is still one
      // station on the ground.
      const key = st.anchor !== null ? 'a' + st.anchor : st.geo[0].toFixed(4) + ',' + st.geo[1].toFixed(4);
      if (seen.has(key)) return;
      seen.add(key);
      const p = linePts[li][i];
      const x = X(p), y = Y(p);
      const terminus = !L.loop && (i === 0 || i === L.stations.length - 1);
      const interchange = st.anchor !== null && linesAtAnchor(g, st.anchor) >= 2;
      const r = st.hub ? 8 : interchange ? 7 : 5;
      out += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="var(--tb-dia-bg)" stroke="var(--tb-dia-tick)" stroke-width="2.5"></circle>';
      if (st.hub) {
        out += '<circle cx="' + x + '" cy="' + y + '" r="12" fill="none" stroke="var(--tb-dia-tick)" stroke-width="1.2"></circle>';
      }
      // Where the line runs flat (東山線 and 桜通線 along their rows), names
      // sit centred above the node and numbers below, so neighbours 1.5
      // units apart never print over each other; elsewhere both go right.
      const a = linePts[li][Math.max(0, i - 1)], b = linePts[li][Math.min(linePts[li].length - 1, i + 1)];
      const flat = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
      const cls = 'tb-dia__label' + (terminus ? ' tb-dia__label--term' : '');
      const codes = st.anchor !== null && ANCHORS[st.anchor].codes;
      if (flat) {
        out += '<text class="' + cls + '" text-anchor="middle" x="' + x + '" y="' + (y - r - 6) + '">' + esc(st.name) + '</text>';
        if (codes) out += '<text class="tb-dia__code" text-anchor="middle" x="' + x + '" y="' + (y + r + 11) + '">' + esc(codes.join('·')) + '</text>';
      } else {
        out += '<text class="' + cls + '" x="' + (x + 12) + '" y="' + (y + 4) + '">' + esc(st.name) + '</text>';
        // Station numbering under the name (spec 01 §4 proposal 12), the
        // Japanese platform-diagram habit.
        if (codes) out += '<text class="tb-dia__code" x="' + (x + 12) + '" y="' + (y + 15) + '">' + esc(codes.join('·')) + '</text>';
      }
    });
  });

  // Each historic line's symbol, a ringed letter in its colour, beyond each
  // end that is not an interchange (both, if both are), pointing away from
  // the line. A ring wears one, off its north-west corner.
  g.lines.forEach((L, li) => {
    const letter = lineLetter(L);
    const pts = linePts[li];
    if (!letter || pts.length < 2) return;
    let ends;
    if (L.loop) {
      let k = 0;
      pts.forEach((p, j) => { if (p[0] + p[1] < pts[k][0] + pts[k][1]) k = j; });
      ends = [[k, null]];
    } else {
      const shared = (j) => L.stations[j].anchor !== null && linesAtAnchor(g, L.stations[j].anchor) >= 2;
      ends = [[0, 1], [pts.length - 1, pts.length - 2]];
      const plain = ends.filter(([j]) => !shared(j));
      if (plain.length) ends = plain;
    }
    for (const [a, b] of ends) {
      const ax = X(pts[a]), ay = Y(pts[a]);
      let cx = ax - 22, cy = ay - 22;
      if (b !== null) {
        const bx = X(pts[b]), by = Y(pts[b]);
        const len = Math.hypot(ax - bx, ay - by) || 1;
        cx = ax + (ax - bx) / len * 26;
        cy = ay + (ay - by) / len * 26;
      }
      out += '<g class="tb-dia__sym"><circle cx="' + cx + '" cy="' + cy + '" r="10" fill="var(--tb-dia-bg)" stroke="' + L.color + '" stroke-width="3"></circle>' +
        '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" fill="' + L.color + '">' + letter + '</text></g>';
    }
  });

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" ' +
    'style="display:block;width:100%;height:100%">' + out + '<g id="dia-trains"></g></svg>';
}

// Per-frame: train dots on the diagram, in their line's colour. Cheap: one
// circle per running train, rebuilt as a string (a dozen nodes at most).
export function diagramTrains(g) {
  const lay = diagramLayout(g);
  if (!lay) return '';
  const { linePts, X, Y } = lay;
  let out = '';
  for (const t of g.trains) {
    if (t.mothballed) continue;
    const pts = linePts[t.line];
    if (!pts || pts.length < 2) continue;
    const pos = trainPos(g, t);
    const a = pts[pos.from], b = pts[pos.to] || a;
    const x = X(a) + (X(b) - X(a)) * pos.f;
    const y = Y(a) + (Y(b) - Y(a)) * pos.f;
    out += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + g.lines[t.line].color + '" stroke="var(--tb-dia-bg)" stroke-width="2"></circle>';
  }
  return out;
}

// Shape signature: rebuild the static SVG only when this moves. Names are
// part of the shape since 0.13.1 (a rename must repaint the labels).
export function diagramSig(g) {
  return g.lines.map((L) => L.stations.length + ':' + L.color + (L.loop ? 'o' : '')).join('|') +
    '|' + g.lines.map((L) => L.stations.map((s) => s.tier).join('')).join(',') +
    '|' + g.lines.map((L) => L.stations.map((s) => s.name).join(';')).join(',');
}
