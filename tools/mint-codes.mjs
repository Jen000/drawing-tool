#!/usr/bin/env node
/**
 * Mints week-access codes for the trial tier and prints JSON ready to paste
 * into the Firebase console.
 *
 *   node tools/mint-codes.mjs            10 codes
 *   node tools/mint-codes.mjs 25         25 codes
 *   node tools/mint-codes.mjs 5 --note "October meetup"
 *
 * Paste the output at Realtime Database → Data → ⋮ → Import JSON, choosing the
 * /codes node. Importing at the root would wipe everything else, so always pick
 * the node first.
 *
 * Codes are inert until someone claims one: claiming is what creates their
 * grant, and the database rules decide what that grant is worth. Minting more
 * codes is how you decide how many trials are in circulation at a time — mint
 * a handful, and when they are gone, nobody new can start a trial until you
 * mint again.
 *
 * No credentials are needed or used. This only generates text.
 */

import { randomInt } from 'node:crypto';

/* Same alphabet as board codes: no 0/O, no 1/I/L, so a code read aloud or
   written on a whiteboard survives the trip. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LENGTH = 8;          /* longer than a board code — these are not typed often */

function mint() {
  let out = '';
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out.slice(0, 4) + '-' + out.slice(4);
}

const args = process.argv.slice(2);
const count = Math.max(1, Math.min(500, parseInt(args[0], 10) || 10));
const noteAt = args.indexOf('--note');
const note = noteAt !== -1 ? args[noteAt + 1] : '';

const codes = {};
const seen = new Set();
while (Object.keys(codes).length < count) {
  const code = mint();
  if (seen.has(code)) continue;
  seen.add(code);
  codes[code] = { mintedAt: Date.now(), ...(note ? { note } : {}) };
}

console.log(JSON.stringify(codes, null, 2));
console.error(`\n${count} code${count === 1 ? '' : 's'} minted${note ? ` (${note})` : ''}.`);
console.error('Paste the JSON above into Realtime Database → Data → /codes → Import JSON.');
console.error('Keep a copy — once claimed, a code shows who took it and when.\n');
console.error(Object.keys(codes).join('\n'));
