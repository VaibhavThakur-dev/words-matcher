// Generic LCS-based diff utilities. Works for any language because tokens are
// split on Unicode letter/number boundaries (\p{L}\p{N}) rather than ASCII rules,
// so scripts like Hindi, Arabic, Chinese, etc. tokenize correctly.

export type DiffOp<T> = { type: "equal" | "delete" | "insert"; value: T };

/** Longest-common-subsequence based diff between two token arrays. */
function lcsDiff<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): DiffOp<T>[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: DiffOp<T>[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) {
      ops.push({ type: "equal", value: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "delete", value: a[i] });
      i++;
    } else {
      ops.push({ type: "insert", value: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ type: "delete", value: a[i++] });
  while (j < m) ops.push({ type: "insert", value: b[j++] });

  return ops;
}

// \p{M} (combining marks) must stay attached to the base letter, otherwise
// scripts that build characters from base + combining marks (Devanagari matras,
// Arabic diacritics, Thai vowel signs, etc.) get chopped mid-syllable and the
// diff shows fragments instead of whole words.
const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;
const WORD_RUN = /[\p{L}\p{M}\p{N}]+/u;

/** Splits a line into word / whitespace / punctuation tokens, Unicode-aware. */
export function tokenizeWords(line: string): string[] {
  const pattern = new RegExp(`${WORD_RUN.source}|\\s+|[^\\s\\p{L}\\p{M}\\p{N}]`, "gu");
  const matches = line.match(pattern);
  return matches ?? [];
}

export function isWordToken(token: string): boolean {
  return WORD_CHAR.test(token);
}

export function isWhitespaceToken(token: string): boolean {
  return /^\s+$/.test(token);
}

function normalizeForComparison(text: string): string {
  return tokenizeWords(text)
    .filter((token) => !isWhitespaceToken(token))
    .map((token) => token.toLocaleLowerCase())
    .join("\u0000");
}

// Sentence-ending punctuation across scripts: Latin ".!?;", Devanagari "।॥",
// CJK fullwidth "。！？", Arabic "؟۔", Armenian "։".
const SENTENCE_END_CHARS = ".!?;।॥。！？؟۔։";
const SENTENCE_SPLIT_RE = new RegExp(`(?<=[${SENTENCE_END_CHARS}])\\s+`, "gu");

/**
 * Re-flows a block of text so line breaks that only exist because the source
 * wrapped at some column width (copy-pasted from a PDF, doc, web page, etc.)
 * don't cause false mismatches. Blank lines are treated as real paragraph
 * breaks and preserved; single line breaks inside a paragraph are treated as
 * incidental wrapping and joined back into a space. Each paragraph is then
 * split into sentences so the comparison unit is "sentence", not "physical
 * line" — two copies of the same content wrapped differently end up
 * producing the exact same sequence of units.
 */
export function toComparisonUnits(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n");
  if (normalized.trim() === "") return [];

  const flowedText = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");

  return flowedText
    .split(SENTENCE_SPLIT_RE)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export type WordDiffOp = DiffOp<string>;

// Two whitespace tokens always count as equal (regardless of how many spaces/tabs),
// so extra or missing spaces between words are never reported as a mismatch.
function wordsEqual(x: string, y: string): boolean {
  if (x === y || x.toLocaleLowerCase() === y.toLocaleLowerCase()) return true;
  return isWhitespaceToken(x) && isWhitespaceToken(y);
}

export function diffWords(lineA: string, lineB: string): WordDiffOp[] {
  const a = tokenizeWords(lineA);
  const b = tokenizeWords(lineB);
  return lcsDiff(a, b, wordsEqual);
}

export type LineResult =
  | { kind: "equal"; lineA: number; lineB: number; text: string }
  | { kind: "modified"; lineA: number; lineB: number; textA: string; textB: string; words: WordDiffOp[] }
  | { kind: "removed"; lineA: number; text: string }
  | { kind: "added"; lineB: number; text: string };

export interface CompareResult {
  lines: LineResult[];
  stats: {
    totalLines: number;
    matchedLines: number;
    modifiedLines: number;
    removedLines: number;
    addedLines: number;
    wordsChanged: number;
  };
}

/**
 * Compares two full texts line by line (LCS-aligned so inserted/removed lines
 * don't desync the rest of the comparison), then word-diffs adjacent
 * delete+insert runs of equal length as "modified" line pairs.
 */
export function compareTexts(textA: string, textB: string): CompareResult {
  const linesA = toComparisonUnits(textA);
  const linesB = toComparisonUnits(textB);
  const lineOps = lcsDiff(linesA, linesB, (x, y) => normalizeForComparison(x) === normalizeForComparison(y));

  const lines: LineResult[] = [];
  let idxA = 0;
  let idxB = 0;
  let i = 0;

  while (i < lineOps.length) {
    const op = lineOps[i];
    if (op.type === "equal") {
      idxA++;
      idxB++;
      lines.push({ kind: "equal", lineA: idxA, lineB: idxB, text: op.value });
      i++;
      continue;
    }

    // Gather a contiguous run of delete/insert ops (a "changed" hunk).
    const dels: string[] = [];
    const inss: string[] = [];
    let j = i;
    while (j < lineOps.length && lineOps[j].type !== "equal") {
      if (lineOps[j].type === "delete") dels.push(lineOps[j].value);
      else inss.push(lineOps[j].value);
      j++;
    }

    const pairCount = Math.min(dels.length, inss.length);
    for (let k = 0; k < pairCount; k++) {
      idxA++;
      idxB++;
      lines.push({
        kind: "modified",
        lineA: idxA,
        lineB: idxB,
        textA: dels[k],
        textB: inss[k],
        words: diffWords(dels[k], inss[k]),
      });
    }
    for (let k = pairCount; k < dels.length; k++) {
      idxA++;
      lines.push({ kind: "removed", lineA: idxA, text: dels[k] });
    }
    for (let k = pairCount; k < inss.length; k++) {
      idxB++;
      lines.push({ kind: "added", lineB: idxB, text: inss[k] });
    }

    i = j;
  }

  const stats = {
    totalLines: lines.length,
    matchedLines: lines.filter((l) => l.kind === "equal").length,
    modifiedLines: lines.filter((l) => l.kind === "modified").length,
    removedLines: lines.filter((l) => l.kind === "removed").length,
    addedLines: lines.filter((l) => l.kind === "added").length,
    wordsChanged: lines.reduce((sum, l) => {
      if (l.kind !== "modified") return sum;
      return sum + l.words.filter((w) => w.type !== "equal" && isWordToken(w.value)).length;
    }, 0),
  };

  return { lines, stats };
}
