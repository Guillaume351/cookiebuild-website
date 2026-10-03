/**
 * Tiny embedded 5×7 bitmap font for the share card (uppercase Latin, digits and
 * common punctuation, a few diacritics). Glyphs are 7 rows, "#" = ink.
 */
const GLYPH_ROWS: Record<string, string> = {
  A: ".###. #...# #...# ##### #...# #...# #...#",
  B: "####. #...# #...# ####. #...# #...# ####.",
  C: ".###. #...# #.... #.... #.... #...# .###.",
  D: "####. #...# #...# #...# #...# #...# ####.",
  E: "##### #.... #.... ####. #.... #.... #####",
  F: "##### #.... #.... ####. #.... #.... #....",
  G: ".###. #...# #.... #.### #...# #...# .####",
  H: "#...# #...# #...# ##### #...# #...# #...#",
  I: ".###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.",
  J: "..### ...#. ...#. ...#. ...#. #..#. .##..",
  K: "#...# #..#. #.#.. ##... #.#.. #..#. #...#",
  L: "#.... #.... #.... #.... #.... #.... #####",
  M: "#...# ##.## #.#.# #.#.# #...# #...# #...#",
  N: "#...# #...# ##..# #.#.# #..## #...# #...#",
  O: ".###. #...# #...# #...# #...# #...# .###.",
  P: "####. #...# #...# ####. #.... #.... #....",
  Q: ".###. #...# #...# #...# #.#.# #..#. .##.#",
  R: "####. #...# #...# ####. #.#.. #..#. #...#",
  S: ".#### #.... #.... .###. ....# ....# ####.",
  T: "##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..",
  U: "#...# #...# #...# #...# #...# #...# .###.",
  V: "#...# #...# #...# #...# #...# .#.#. ..#..",
  W: "#...# #...# #...# #.#.# #.#.# #.#.# .#.#.",
  X: "#...# #...# .#.#. ..#.. .#.#. #...# #...#",
  Y: "#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..",
  Z: "##### ....# ...#. ..#.. .#... #.... #####",
  "0": ".###. #...# #..## #.#.# ##..# #...# .###.",
  "1": "..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.",
  "2": ".###. #...# ....# ...#. ..#.. .#... #####",
  "3": "##### ...#. ..#.. ...#. ....# #...# .###.",
  "4": "...#. ..##. .#.#. #..#. ##### ...#. ...#.",
  "5": "##### #.... ####. ....# ....# #...# .###.",
  "6": "..##. .#... #.... ####. #...# #...# .###.",
  "7": "##### ....# ...#. ..#.. .#... .#... .#...",
  "8": ".###. #...# #...# .###. #...# #...# .###.",
  "9": ".###. #...# #...# .#### ....# ...#. .##..",
  " ": "..... ..... ..... ..... ..... ..... .....",
  "-": "..... ..... ..... .###. ..... ..... .....",
  _: "..... ..... ..... ..... ..... ..... #####",
  ".": "..... ..... ..... ..... ..... .##.. .##..",
  ",": "..... ..... ..... ..... .##.. ..#.. .#...",
  "!": "..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..",
  "?": ".###. #...# ....# ...#. ..#.. ..... ..#..",
  "'": "..#.. ..#.. .#... ..... ..... ..... .....",
  ":": "..... .##.. .##.. ..... .##.. .##.. .....",
  "/": "....# ....# ...#. ..#.. .#... #.... #....",
  "&": ".##.. #..#. #.#.. .#... #.#.# #..#. .##.#",
  "+": "..... ..#.. ..#.. ##### ..#.. ..#.. .....",
  "#": ".#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.",
  "(": "...#. ..#.. .#... .#... .#... ..#.. ...#.",
  ")": ".#... ..#.. ...#. ...#. ...#. ..#.. .#...",
  "*": "..... ..#.. #.#.# .###. #.#.# ..#.. .....",
  "\u2665": ".##.##. ####### ####### ####### .#####. ..###.. ...#...",
};

/** Diacritics drawn in the rows above (or below, for the cedilla) a capital letter. */
const MARK_ROWS: Record<string, { rows: string; below?: true }> = {
  "\u0301": { rows: "...#. ..#.." },
  "\u0300": { rows: ".#... ..#.." },
  "\u0302": { rows: "..#.. .#.#." },
  "\u0308": { rows: "..... .#.#." },
  "\u0303": { rows: ".##.# #.##." },
  "\u030a": { rows: "..#.. .#.#." },
  "\u0327": { rows: "..#.. .#...", below: true },
};

export const FONT_HEIGHT = 7;

export interface Glyph {
  width: number;
  bits: Uint8Array;
}

export interface FontMark {
  width: number;
  bits: Uint8Array;
  below: boolean;
}

function parseRows(rows: string) {
  const lines = rows.split(" ");
  const width = lines[0]!.length;
  const bits = new Uint8Array(width * lines.length);
  lines.forEach((row, y) => {
    for (let x = 0; x < width; x += 1) bits[y * width + x] = row[x] === "#" ? 1 : 0;
  });
  return { width, bits };
}

const GLYPHS = new Map<string, Glyph>(Object.entries(GLYPH_ROWS).map(([char, rows]) => [char, parseRows(rows)]));
const MARKS = new Map<string, FontMark>(
  Object.entries(MARK_ROWS).map(([mark, { rows, below }]) => [mark, { ...parseRows(rows), below: below === true }]),
);

export interface FontToken {
  char: string;
  mark: string | null;
}

const TYPOGRAPHIC: Record<string, string> = {
  "\u2018": "'", "\u2019": "'", "\u201c": "'", "\u201d": "'", "\"": "'",
  "\u2013": "-", "\u2014": "-", "\u2026": "...", "\u00a0": " ", "\u202f": " ",
};

function canonical(text: string) {
  return [...text.normalize("NFD")].map((char) => TYPOGRAPHIC[char] ?? char).join("");
}

/** Splits text into drawable uppercase characters with at most one diacritic each. */
export function fontTokens(text: string): FontToken[] {
  const tokens: FontToken[] = [];
  for (const char of canonical(text)) {
    if (/[\u0300-\u036f]/.test(char)) {
      const last = tokens[tokens.length - 1];
      if (last && !last.mark && MARKS.has(char)) last.mark = char;
      continue;
    }
    const upper = char === "\u00df" ? "SS" : char.toUpperCase();
    for (const part of upper) tokens.push({ char: GLYPHS.has(part) ? part : "?", mark: null });
  }
  return tokens;
}

/** Uppercases and strips diacritics; characters without a glyph become "?". */
export function normalizeFontText(text: string) {
  return fontTokens(text).map((token) => token.char).join("");
}

/** True when every character can be drawn without a "?" substitute. */
export function isFontRenderable(text: string) {
  return [...canonical(text).replace(/[\u0300-\u036f]/g, "").toUpperCase()].every((char) => GLYPHS.has(char));
}

export function glyph(char: string): Glyph {
  return GLYPHS.get(char) ?? GLYPHS.get("?")!;
}

export function fontMark(mark: string | null): FontMark | null {
  return mark ? MARKS.get(mark) ?? null : null;
}

/** Width in pixels of text at a scale (1 px letter spacing per scale unit). */
export function textWidth(text: string, scale: number) {
  const tokens = fontTokens(text);
  if (!tokens.length) return 0;
  return tokens.reduce((sum, token) => sum + (glyph(token.char).width + 1) * scale, 0) - scale;
}
