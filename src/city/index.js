// The city this build plays (spec 01 §1.1): fixed per page. The browser
// always gets the shipped pack; the dev harness under node may pick another
// with METROS_CITY=stockholm, which is how the inherited smoke suite and the
// value gate keep measuring the original game.

import nagoya from './nagoya/index.js';
import stockholm from './stockholm/index.js';

const PACKS = { nagoya, stockholm };
const want = globalThis.process?.env?.METROS_CITY;

export default PACKS[want] || nagoya;
