import lexicon from "./lexicon.json" with { type: "json" };

const IDENTITY = new Set([
  ".", ",", "?", "!", ";", ":", "'", '"', "-", "(", ")", "/", "&", "@", "#", "%", "+", "=", "[", "]",
  "…", "—", "–",
]);

const wordToSymbol = new Map<string, string>();
const symbolToWord = new Map<string, string>();
for (let i = 0; i < lexicon.words.length; i++) {
  const word = lexicon.words[i]!;
  const symbol = lexicon.symbols[i]!;
  wordToSymbol.set(word, symbol);
  symbolToWord.set(symbol, word);
}

export const LACON_WORDS = lexicon.words.length;

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

function normalize(text: string): string {
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function tokenize(text: string): string[] {
  const re = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[ \t]+|\n+|./gu;
  return [...text.matchAll(re)].map((match) => match[0]);
}

function foldKey(token: string): string {
  return token.replaceAll("’", "'").toLowerCase();
}

function caseMark(token: string): "" | "^" | "*" {
  const folded = token.replaceAll("’", "'");
  const lower = folded.toLowerCase();
  if (folded === lower) return "";
  if (folded.length === 1 || folded === lower[0]!.toUpperCase() + lower.slice(1)) return "^";
  if (folded === folded.toUpperCase()) return "*";
  return "";
}

function irregular(token: string): boolean {
  const folded = token.replaceAll("’", "'");
  const lower = folded.toLowerCase();
  if (folded === lower) return false;
  if (folded.length === 1) return false;
  if (folded === folded.toUpperCase()) return false;
  if (folded === lower[0]!.toUpperCase() + lower.slice(1)) return false;
  return true;
}

function escapeLiteral(text: string): string {
  return text.replaceAll("`", "``");
}

function applyCase(word: string, mark: "" | "^" | "*"): string {
  if (mark === "*") return word.toUpperCase();
  if (mark === "^") return word[0]!.toUpperCase() + word.slice(1);
  return word;
}

export function encode(english: string): string {
  let out = "";
  for (const token of tokenize(normalize(english))) {
    if (/^[ \t\n]+$/.test(token)) {
      out += token;
      continue;
    }
    if (IDENTITY.has(token)) {
      out += token;
      continue;
    }
    if (/^[0-9]+$/.test(token)) {
      out += token;
      continue;
    }
    if (irregular(token) || !wordToSymbol.has(foldKey(token))) {
      out += `~${escapeLiteral(token.replaceAll("’", "'"))}\``;
      continue;
    }
    out += caseMark(token) + wordToSymbol.get(foldKey(token));
  }
  return out;
}

export type Gloss = {
  symbol: string;
  gloss: string;
  kind: "word" | "punct" | "space" | "number" | "literal";
};

export function decode(lacon: string): string {
  return gloss(lacon)
    .map((part) => part.gloss)
    .join("");
}

export function gloss(lacon: string): Gloss[] {
  const chars = [...normalize(lacon)];
  const parts: Gloss[] = [];
  let i = 0;
  let mark: "" | "^" | "*" = "";
  const takeMark = () => {
    const current = mark;
    mark = "";
    return current;
  };

  while (i < chars.length) {
    const ch = chars[i]!;
    if (ch === " " || ch === "\t" || ch === "\n") {
      let end = i + 1;
      while (end < chars.length && chars[end] === ch) end++;
      const raw = chars.slice(i, end).join("");
      parts.push({ symbol: raw, gloss: raw, kind: "space" });
      i = end;
      continue;
    }
    if (ch === "^") {
      mark = "^";
      i++;
      continue;
    }
    if (ch === "*") {
      mark = "*";
      i++;
      continue;
    }
    if (ch === "~") {
      i++;
      let lit = "";
      while (i < chars.length) {
        if (chars[i] === "`" && chars[i + 1] === "`") {
          lit += "`";
          i += 2;
          continue;
        }
        if (chars[i] === "`") {
          i++;
          break;
        }
        lit += chars[i];
        i++;
      }
      parts.push({ symbol: `~${escapeLiteral(lit)}\``, gloss: applyCase(lit, takeMark()), kind: "literal" });
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      let end = i + 1;
      while (end < chars.length && chars[end]! >= "0" && chars[end]! <= "9") end++;
      const raw = chars.slice(i, end).join("");
      parts.push({ symbol: raw, gloss: applyCase(raw, takeMark()), kind: "number" });
      i = end;
      continue;
    }
    i++;
    if (IDENTITY.has(ch)) {
      parts.push({ symbol: ch, gloss: ch, kind: "punct" });
      takeMark();
      continue;
    }
    const word = symbolToWord.get(ch);
    if (!word) {
      throw new Error(`Unknown Lacon mark U+${ch.codePointAt(0)!.toString(16).toUpperCase()}.`);
    }
    parts.push({ symbol: ch, gloss: applyCase(word, takeMark()), kind: "word" });
  }
  if (mark) throw new Error("Lacon case mark is missing its word.");
  return parts;
}

export function roundTrip(english: string): boolean {
  return decode(encode(english)) === normalize(english).replaceAll("’", "'");
}
