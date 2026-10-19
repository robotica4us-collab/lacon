import atoms from "./atoms.json" with { type: "json" };
import lexicon from "../lexicon.json" with { type: "json" };

const words = lexicon.words;
const NWORDS = words.length;
const N = atoms.length;
const wordIndex = new Map(words.map((word, index) => [word, index]));

export const PITH_PIECES = N;

const PUNCT = [".", ",", "?", "!", ";", ":", "'", '"', "-", "(", ")", "/", "&", "@", "#", "%", "+", "=", "[", "]", "…", "—", "–"];
const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'";

let cursor = 0;
const END = cursor++;
const SP = cursor++;
const NL = cursor++;
const TAB = cursor++;
const UNI = cursor++;
const punctId = new Map(PUNCT.map((ch) => [ch, cursor++]));
const punctById = new Map([...punctId.entries()].map(([ch, id]) => [id, ch]));
const DIGIT0 = cursor;
cursor += 10;
const CHAR0 = cursor;
cursor += CHARSET.length;
const charId = new Map([...CHARSET].map((ch, index) => [ch, CHAR0 + index]));
const B128 = cursor;
cursor += 128;
const WORD0 = cursor;
cursor += NWORDS * 3;
const NSYM = cursor;

const START = 0;
const AFTER = 1;
const PUNCT_S = 2;
const SPELL = 3;
const NUM = 4;
const U1 = 5;
const U2 = 6;
const U3 = 7;
const NSTATE = 8;

const punctSym = new Uint8Array(NSYM);
for (const id of punctId.values()) punctSym[id] = 1;

function zipf(rank: number): number {
  return Math.max(1, Math.round(500_000 / (rank + 1)));
}

const punctBase = new Map<string, number>([
  [".", 220_000],
  [",", 180_000],
  ["?", 70_000],
  ["!", 40_000],
  [";", 12_000],
  [":", 18_000],
  ["'", 30_000],
  ['"', 28_000],
  ["-", 36_000],
  ["(", 16_000],
  [")", 16_000],
  ["/", 8_000],
  ["&", 6_000],
  ["@", 4_000],
  ["#", 4_000],
  ["%", 4_000],
  ["+", 3_000],
  ["=", 3_000],
  ["[", 2_000],
  ["]", 2_000],
  ["…", 8_000],
  ["—", 6_000],
  ["–", 4_000],
]);

function blank(): Float64Array {
  return new Float64Array(NSYM);
}

function paintWords(w: Float64Array, lower: number, title: number, upper: number) {
  for (let i = 0; i < NWORDS; i++) {
    const z = zipf(i);
    w[WORD0 + i] = Math.max(1, Math.round(z * lower));
    w[WORD0 + NWORDS + i] = Math.max(1, Math.round(z * title));
    w[WORD0 + 2 * NWORDS + i] = Math.max(1, Math.round(z * upper));
  }
}

function paintPunct(w: Float64Array, scale: number) {
  for (const [ch, id] of punctId) w[id] = Math.max(1, Math.round((punctBase.get(ch) ?? 1000) * scale));
}

function paintChars(w: Float64Array, lowerW: number, upperW: number) {
  for (let i = 0; i < 26; i++) w[CHAR0 + i] = lowerW;
  for (let i = 26; i < 52; i++) w[CHAR0 + i] = upperW;
  w[CHAR0 + 52] = Math.max(1, Math.round(lowerW / 3));
}

function paintDigits(w: Float64Array, weight: number) {
  for (let d = 0; d < 10; d++) w[DIGIT0 + d] = weight;
}

type Table = { w: Float64Array; cum: Float64Array; total: number };

const tables: Table[] = [];
{
  const specs: Float64Array[] = [];
  const s = blank();
  paintWords(s, 0.45, 1.15, 0.04);
  s[END] = 90_000;
  s[SP] = 6_000;
  s[NL] = 18_000;
  s[TAB] = 400;
  s[UNI] = 800;
  paintPunct(s, 0.25);
  paintDigits(s, 4_000);
  paintChars(s, 5_000, 9_000);
  specs[START] = s;

  const m = blank();
  paintWords(m, 0.008, 0.004, 0.002);
  m[END] = 1_800_000;
  m[NL] = 50_000;
  m[TAB] = 800;
  m[UNI] = 400;
  paintPunct(m, 1.15);
  paintDigits(m, 1_000);
  paintChars(m, 700, 500);
  specs[AFTER] = m;

  const r = blank();
  paintWords(r, 0.04, 0.05, 0.008);
  r[END] = 1_600_000;
  r[NL] = 40_000;
  r[TAB] = 600;
  r[UNI] = 500;
  paintPunct(r, 0.45);
  paintDigits(r, 2_000);
  paintChars(r, 2_500, 4_000);
  specs[PUNCT_S] = r;

  const l = blank();
  l[END] = 40_000;
  l[SP] = 70_000;
  l[NL] = 12_000;
  l[TAB] = 400;
  l[UNI] = 2_000;
  paintPunct(l, 0.4);
  paintDigits(l, 8_000);
  paintChars(l, 80_000, 14_000);
  paintWords(l, 0.002, 0.001, 0.001);
  specs[SPELL] = l;

  const d = blank();
  paintDigits(d, 90_000);
  d[END] = 50_000;
  d[SP] = 80_000;
  d[NL] = 14_000;
  d[TAB] = 400;
  d[UNI] = 400;
  paintPunct(d, 0.8);
  paintChars(d, 6_000, 4_000);
  paintWords(d, 0.02, 0.01, 0.004);
  specs[NUM] = d;

  for (const u of [U1, U2, U3]) {
    const t = blank();
    for (let i = 0; i < 128; i++) t[B128 + i] = 1;
    specs[u] = t;
  }

  for (const state of [AFTER, PUNCT_S]) {
    const w = specs[state]!;
    let rest = 0;
    for (let i = 0; i < NSYM; i++) if (i !== SP) rest += w[i]!;
    w[SP] = state === AFTER ? rest * 4 : Math.round(rest * 1.6);
  }

  for (let state = 0; state < NSTATE; state++) {
    const w = specs[state]!;
    const cum = new Float64Array(NSYM + 1);
    for (let i = 0; i < NSYM; i++) cum[i + 1] = cum[i]! + w[i]!;
    const total = cum[NSYM]!;
    if (total > Number.MAX_SAFE_INTEGER) throw new Error("Pith model overflow");
    tables[state] = { w, cum, total };
  }
}

function nextState(state: number, sym: number): number {
  if (sym === SP || sym === NL || sym === TAB) return START;
  if (sym === UNI) return U1;
  if (sym >= B128 && sym < B128 + 128) {
    if (state === U1) return U2;
    if (state === U2) return U3;
    if (state === U3) return SPELL;
  }
  if (punctSym[sym]) return PUNCT_S;
  if (sym >= DIGIT0 && sym < DIGIT0 + 10) return NUM;
  if (sym >= CHAR0 && sym < CHAR0 + CHARSET.length) return SPELL;
  if (sym >= WORD0) return AFTER;
  throw new Error("This isn't Pith.");
}

function normalize(text: string): string {
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("’", "'").replaceAll("‘", "'");
}

function caseOf(token: string, key: string): number {
  if (token === key) return 0;
  if (token === key.toUpperCase() && key.length > 1) return 2;
  if (token === key[0]!.toUpperCase() + key.slice(1)) return 1;
  return -1;
}

function applyCase(word: string, cas: number): string {
  if (cas === 2) return word.toUpperCase();
  if (cas === 1) return word[0]!.toUpperCase() + word.slice(1);
  return word;
}

function emitUni(syms: number[], cp: number) {
  syms.push(UNI);
  syms.push(B128 + Math.floor(cp / 16384), B128 + (Math.floor(cp / 128) % 128), B128 + (cp % 128));
}

function lexSymbols(text: string): number[] {
  const syms: number[] = [];
  const re = /[0-9]+|[\p{L}]+(?:'[\p{L}]+)*|[ \t]+|\n+|./gu;
  for (const match of normalize(text).matchAll(re)) {
    const tok = match[0];
    if (/^[ \t\n]+$/.test(tok)) {
      for (const ch of tok) syms.push(ch === " " ? SP : ch === "\t" ? TAB : NL);
      continue;
    }
    if (/^[0-9]+$/.test(tok)) {
      for (const ch of tok) syms.push(DIGIT0 + (ch.charCodeAt(0) - 48));
      continue;
    }
    if ([...tok].length === 1 && punctId.has(tok)) {
      syms.push(punctId.get(tok)!);
      continue;
    }
    const key = tok.toLowerCase();
    const id = wordIndex.get(key);
    const cas = id == null ? -1 : caseOf(tok, key);
    if (id != null && cas >= 0 && /^[\p{L}]+(?:'[\p{L}]+)*$/u.test(tok)) {
      syms.push(WORD0 + cas * NWORDS + id);
      continue;
    }
    for (const ch of tok) {
      if (punctId.has(ch)) syms.push(punctId.get(ch)!);
      else if (charId.has(ch)) syms.push(charId.get(ch)!);
      else if (/^[0-9]$/.test(ch)) syms.push(DIGIT0 + (ch.charCodeAt(0) - 48));
      else emitUni(syms, ch.codePointAt(0)!);
    }
  }
  syms.push(END);
  return syms;
}

function divCeil(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

function toDigits(low: bigint, width: bigint, den: bigint): number[] {
  const n = BigInt(N);
  const need = den.toString(2).length - width.toString(2).length + 2;
  let k = Math.max(1, Math.ceil(need / Math.log2(N)));
  let Nk = n ** BigInt(k);
  for (let bump = 0; bump < 8; bump++) {
    const q = divCeil(low * Nk, den);
    if (q < Nk && q * den < (low + width) * Nk) {
      const digits = new Array<number>(k);
      let x = q;
      for (let i = k - 1; i >= 0; i--) {
        digits[i] = Number(x % n);
        x /= n;
      }
      return digits;
    }
    k += 1;
    Nk *= n;
  }
  throw new Error("Pith could not pack that.");
}

function encodeSymbols(syms: number[]): number[] {
  let low = 0n;
  let width = 1n;
  let den = 1n;
  let state = START;
  for (const sym of syms) {
    const table = tables[state]!;
    const weight = table.w[sym] ?? 0;
    if (weight === 0) throw new Error("Pith could not pack that.");
    const total = BigInt(table.total);
    low = low * total + BigInt(table.cum[sym]!) * width;
    width *= BigInt(weight);
    den *= total;
    state = sym === END ? state : nextState(state, sym);
  }
  return toDigits(low, width, den);
}

function pick(cum: Float64Array, span: bigint, scaled: bigint): number {
  let lo = 0;
  let hi = NSYM - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (BigInt(cum[mid + 1]!) * span <= scaled) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function decodeSymbols(digits: number[]): number[] {
  const n = BigInt(N);
  let q = 0n;
  for (const digit of digits) q = q * n + BigInt(digit);
  const Nk = n ** BigInt(digits.length);
  let low = 0n;
  let width = 1n;
  let den = 1n;
  let state = START;
  const out: number[] = [];
  for (let guard = 0; guard < 100_000; guard++) {
    const table = tables[state]!;
    const num = q * den - low * Nk;
    const span = width * Nk;
    if (num < 0n || num >= span) throw new Error("This isn't Pith.");
    const sym = pick(table.cum, span, num * BigInt(table.total));
    if ((table.w[sym] ?? 0) === 0) throw new Error("This isn't Pith.");
    out.push(sym);
    const total = BigInt(table.total);
    low = low * total + BigInt(table.cum[sym]!) * width;
    width *= BigInt(table.w[sym]!);
    den *= total;
    if (sym === END) return out;
    state = nextState(state, sym);
  }
  throw new Error("This isn't Pith.");
}

function expand(syms: number[]): string {
  let text = "";
  for (let i = 0; i < syms.length; i++) {
    const sym = syms[i]!;
    if (sym === END) break;
    if (sym === SP) text += " ";
    else if (sym === NL) text += "\n";
    else if (sym === TAB) text += "\t";
    else if (sym === UNI) {
      const d0 = syms[++i]! - B128;
      const d1 = syms[++i]! - B128;
      const d2 = syms[++i]! - B128;
      if (d0 < 0 || d1 < 0 || d2 < 0 || d0 > 127 || d1 > 127 || d2 > 127) throw new Error("This isn't Pith.");
      const cp = d0 * 16384 + d1 * 128 + d2;
      if (cp > 0x10ffff) throw new Error("This isn't Pith.");
      text += String.fromCodePoint(cp);
    } else if (punctById.has(sym)) text += punctById.get(sym);
    else if (sym >= DIGIT0 && sym < DIGIT0 + 10) text += String(sym - DIGIT0);
    else if (sym >= CHAR0 && sym < CHAR0 + CHARSET.length) text += CHARSET[sym - CHAR0];
    else if (sym >= WORD0) {
      const rel = sym - WORD0;
      text += applyCase(words[rel % NWORDS]!, Math.floor(rel / NWORDS));
    } else throw new Error("This isn't Pith.");
  }
  return text;
}

function cmpAtom(atom: string, text: string, index: number): number {
  const remain = text.length - index;
  const n = Math.min(atom.length, remain);
  for (let k = 0; k < n; k++) {
    const diff = atom.charCodeAt(k) - text.charCodeAt(index + k);
    if (diff !== 0) return diff;
  }
  if (atom.length === remain) return 0;
  return atom.length < remain ? -1 : 1;
}

function takeAtom(text: string, index: number): { id: number; next: number } {
  let lo = 0;
  let hi = atoms.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cmpAtom(atoms[mid]!, text, index) <= 0) lo = mid + 1;
    else hi = mid;
  }
  const id = lo - 1;
  const atom = id >= 0 ? atoms[id] : undefined;
  if (atom != null && text.startsWith(atom, index)) return { id, next: index + atom.length };
  throw new Error("This isn't Pith.");
}

export function encode(english: string): string {
  const text = normalize(english);
  if (text === "") return "";
  const digits = encodeSymbols(lexSymbols(text));
  let out = "";
  for (const digit of digits) out += atoms[digit];
  return out;
}

export function decode(pith: string): string {
  if (pith === "") return "";
  const digits: number[] = [];
  let index = 0;
  while (index < pith.length) {
    const piece = takeAtom(pith, index);
    digits.push(piece.id);
    index = piece.next;
  }
  return expand(decodeSymbols(digits));
}
