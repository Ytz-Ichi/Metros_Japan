// Numbers as the player reads them (spec 01 §3.10). DOM-free so the smoke
// suites can hold it to its promises. Internal values never change: money is
// shown at the pack's scale (Nagoya: x1000, in yen), and big numbers fold
// into 万・億・兆 for a Japanese city or K/M/B for the original.

import CITY from './city/index.js';

const CUR = CITY.currency || { unit: 'kr', scale: 1, locale: 'sv-SE', shortForm: 'kmb' };
let short = true;

export function setShort(on) {
  short = !!on;
}

// Thousands grouped by the city's own locale; Swedish groups with a thin
// space, never a comma (pass 02, section 02).
export function grouped(n) {
  const s = Math.floor(n).toLocaleString(CUR.locale);
  return CUR.locale === 'sv-SE' ? s.replace(/\s/g, ' ') : s;
}

const KMB = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
const WAN = [[1e16, '京'], [1e12, '兆'], [1e8, '億'], [1e4, '万']];

// Three significant figures, so the readout never jitters in width.
const sig3 = (v) => (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0));

// A count: riders, stations, anything that is not money.
export function fmtCount(n) {
  n = Math.floor(n);
  if (!isFinite(n)) return '∞';
  if (CUR.shortForm === 'wan') {
    if (!short || n < 1e4) return grouped(n);
    for (const [base, word] of WAN) {
      if (n >= base * 0.9995) {
        const v = n / base;
        // 9999.5万 must roll over to 1.00億, not print 10000万.
        if (v >= 9999.5 && word !== '京') continue;
        // Japanese reads 90万, not 90.0万: trailing zeros go.
        return sig3(v).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') + word;
      }
    }
    return grouped(n);
  }
  if (!short || n < 1e5) return grouped(n);
  let v = n, i = 0;
  // 999.5 not 1000: rounding to zero decimals at three digits otherwise prints
  // "1000K" instead of rolling over to "1.00M".
  while (v >= 999.5 && i < KMB.length - 1) { v /= 1000; i++; }
  return sig3(v) + KMB[i];
}

// Money, unitless: the number the HUD sets large beside a small unit.
export function fmtMoneyNum(n) {
  return fmtCount(n * CUR.scale);
}

export function moneyUnit() {
  return CUR.unit;
}

// Money with its unit: '90万円', '1 500 kr'.
export function fmtMoney(n) {
  return fmtMoneyNum(n) + (CUR.unit === 'kr' ? ' kr' : CUR.unit);
}

// A rate per second. Stockholm keeps its decimal (12.3 kr/s); yen rates are
// whole numbers already at x1000.
export function fmtRate(n) {
  if (CUR.scale === 1) return n.toFixed(1) + ' kr/s';
  return fmtMoney(Math.round(n * CUR.scale) / CUR.scale) + '/秒';
}

// The HUD's rates, short enough for the money panel: 「+1.2万/秒」, the unit
// already standing large beside the balance (spec 01 §3.10).
export function fmtRateShort(n) {
  if (CUR.scale === 1) return n.toFixed(1) + ' kr/s';
  return fmtMoneyNum(Math.round(n * CUR.scale) / CUR.scale) + '/秒';
}
