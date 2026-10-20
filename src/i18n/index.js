// The string table the page speaks (spec 01 §3.8): the language's common
// table, with the city pack's own strings merged over it. Plain objects merge
// key by key; arrays and functions are replaced whole.

import CITY from '../city/index.js';
import * as sim from '../sim.js';
import { fmtMoney, fmtRate } from '../format.js';
import { makeStrings as en } from './en.js';
import { makeStrings as ja } from './ja.js';

const TABLES = { en, ja };

function merge(base, over) {
  if (!over) return base;
  for (const [k, v] of Object.entries(over)) {
    const b = base[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)) {
      merge(b, v);
    } else {
      base[k] = v;
    }
  }
  return base;
}

export const LOCALE = TABLES[CITY.locale] ? CITY.locale : 'en';

const ctx = {
  B: sim.BAL,
  CAT: Object.fromEntries(sim.CATALOG.map((u) => [u.id, u])),
  money: fmtMoney,
  rate: fmtRate,
};

export const STR = merge(TABLES[LOCALE](ctx),
  typeof CITY.strings?.[LOCALE] === 'function' ? CITY.strings[LOCALE](ctx) : CITY.strings?.[LOCALE]);

// Every key the English table has must exist here too, or a panel prints
// "undefined" (spec 01 §5.1 item 12). Said once, at boot, in the console.
export function missingKeys() {
  const ref = en(ctx);
  const out = [];
  const walk = (a, b, path) => {
    for (const k of Object.keys(a)) {
      if (!(k in b)) { out.push(path + k); continue; }
      if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && typeof b[k] === 'object') walk(a[k], b[k], path + k + '.');
    }
  };
  walk(ref, STR, '');
  // Eras, front pages and the charters belong to a city, not a language:
  // the reference's own are skipped, and this city's are required instead.
  const filtered = out.filter((k) => !/^(eras|news)\./.test(k) &&
    !(k.startsWith('shop.') && !sim.CATALOG.some((i) => i.id === k.slice(5))));
  for (const it of sim.CATALOG) if (!STR.shop[it.id]) filtered.push('shop.' + it.id);
  for (const e of sim.ERAS.slice(1)) {
    if (!STR.eras[e.key]) filtered.push('eras.' + e.key);
    if (!STR.news[e.key]) filtered.push('news.' + e.key);
  }
  if (!STR.news.slut) filtered.push('news.slut');
  return filtered;
}
