// Geometry shared by every city (spec 01 §3.1): distances, rings, the water
// test and the density field. Nothing here knows which city it is measuring;
// the pack's arrays come in as arguments, so the engine never holds a module
// constant that names a place.

const KM_PER_DEG_LAT = 111.32;

export function kmBetween(a, b) {
  const meanLat = ((a[0] + b[0]) / 2) * Math.PI / 180;
  const dLat = (b[0] - a[0]) * KM_PER_DEG_LAT;
  const dLon = (b[1] - a[1]) * KM_PER_DEG_LAT * Math.cos(meanLat);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

// Ray-cast point-in-ring test ([lat, lon] points).
export function inRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0], xi = ring[i][1];
    const yj = ring[j][0], xj = ring[j][1];
    if (((yi > pt[0]) !== (yj > pt[0])) &&
        (pt[1] < (xj - xi) * (pt[0] - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Does the segment a-b cross any of the rings? Sampled, like it always was.
export function crossesWater(a, b, water) {
  for (let f = 0; f <= 1; f += 0.05) {
    const pt = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    for (const w of water) if (inRing(pt, w.ring)) return true;
  }
  return false;
}

const DENSITY_FLOOR = 0.35;
const DENSITY_CAP = 0.95; // anchors (1.0) always beat free spots

// Demand multiplier + district name for a free spot at geo.
export function densityAt(geo, districts) {
  let mult = DENSITY_FLOOR;
  let district = null;
  let best = -1;
  for (const d of districts) {
    const dist = kmBetween(geo, d.geo);
    if (dist > d.rKm * 1.4) continue;
    const score = d.w * Math.max(0, 1 - (dist / d.rKm) ** 2);
    if (score > best) {
      best = score;
      district = d.name; // the strongest blob names the place, even at its edge
    }
    if (score > mult) mult = score;
  }
  return { mult: Math.min(DENSITY_CAP, Math.round(mult * 100) / 100), district };
}
