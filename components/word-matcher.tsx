"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  compareTexts,
  isWhitespaceToken,
  type LineResult,
  type WordDiffOp,
} from "@/lib/diff";

function WordDiffLine({
  words,
  side,
}: {
  words: WordDiffOp[];
  side: "a" | "b";
}) {
  return (
    <p
      dir="auto"
      className="whitespace-pre-wrap wrap-break-word font-sans text-sm leading-relaxed"
    >
      {words.map((w, idx) => {
        const visible =
          w.type === "equal" ||
          (side === "a" ? w.type === "delete" : w.type === "insert");
        if (!visible) return null;

        // Spacing differences are never treated as mistakes, so plain spaces
        // never get the red/green mismatch styling.
        if (w.type === "equal" || isWhitespaceToken(w.value)) {
          return <span key={idx}>{w.value}</span>;
        }
        if (side === "a") {
          return (
            <span
              key={idx}
              className="rounded bg-red-500/20 text-red-600 line-through dark:text-red-400"
            >
              {w.value}
            </span>
          );
        }
        return (
          <span
            key={idx}
            className="rounded bg-green-500/20 text-green-700 dark:text-green-400"
          >
            {w.value}
          </span>
        );
      })}
    </p>
  );
}

function LineRow({ line }: { line: LineResult }) {
  if (line.kind === "equal") {
    return (
      <div className="flex gap-3 rounded-md px-3 py-1.5">
        <span className="w-10 shrink-0 select-none text-right text-xs tabular-nums text-muted-foreground">
          {line.lineA}
        </span>
        <p
          dir="auto"
          className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-muted-foreground"
        >
          {line.text || <span className="italic">(empty line)</span>}
        </p>
      </div>
    );
  }

  if (line.kind === "modified") {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
        <div className="mb-1 flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-500/50 text-amber-600 dark:text-amber-400"
          >
            Line {line.lineA}
          </Badge>
          <span className="text-xs text-muted-foreground">mismatch</span>
        </div>
        <div className="grid gap-1.5">
          <div className="flex gap-2">
            <span className="w-14 shrink-0 select-none text-xs text-muted-foreground">
              Text A
            </span>
            <WordDiffLine words={line.words} side="a" />
          </div>
          <div className="flex gap-2">
            <span className="w-14 shrink-0 select-none text-xs text-muted-foreground">
              Text B
            </span>
            <WordDiffLine words={line.words} side="b" />
          </div>
        </div>
      </div>
    );
  }

  if (line.kind === "removed") {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2">
        <div className="mb-1 flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-red-500/50 text-red-600 dark:text-red-400"
          >
            Line {line.lineA}
          </Badge>
          <span className="text-xs text-muted-foreground">
            only in Text A (missing in B)
          </span>
        </div>
        <p
          dir="auto"
          className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-red-600 line-through dark:text-red-400"
        >
          {line.text || <span className="italic">(empty line)</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2">
      <div className="mb-1 flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-green-500/50 text-green-700 dark:text-green-400"
        >
          Line {line.lineB}
        </Badge>
        <span className="text-xs text-muted-foreground">
          only in Text B (missing in A)
        </span>
      </div>
      <p
        dir="auto"
        className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-green-700 dark:text-green-400"
      >
        {line.text || <span className="italic">(empty line)</span>}
      </p>
    </div>
  );
}

const STORAGE_KEY_A = "words-matcher:text-a";
const STORAGE_KEY_B = "words-matcher:text-b";

export function WordMatcher() {
  const [textA, setTextA] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(STORAGE_KEY_A) ?? "";
    } catch {
      return "";
    }
  });
  const [textB, setTextB] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(STORAGE_KEY_B) ?? "";
    } catch {
      return "";
    }
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_A, textA);
    } catch {}
  }, [textA]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_B, textB);
    } catch {}
  }, [textB]);

  const result = useMemo(() => compareTexts(textA, textB), [textA, textB]);
  const hasIssues =
    result.stats.modifiedLines +
      result.stats.removedLines +
      result.stats.addedLines >
    0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Words Matcher</h1>
        <p className="text-sm text-muted-foreground">
          Paste your original content and the content to check against it. Works
          with any language &mdash; it will point out exactly which lines and
          words don&rsquo;t match.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Text A</CardTitle>
            <CardDescription>Original content</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="text-a" className="sr-only">
              Text A
            </Label>
            <Textarea
              id="text-a"
              dir="auto"
              placeholder="Paste the original content here..."
              className="min-h-65 font-sans text-sm"
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Text B</CardTitle>
            <CardDescription>
              Content to compare (e.g. what&rsquo;s on the site)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="text-b" className="sr-only">
              Text B
            </Label>
            <Textarea
              id="text-b"
              dir="auto"
              placeholder="Paste the content you want to check here..."
              className="min-h-65 font-sans text-sm"
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setSubmitted(true)}>Compare</Button>
        <Button
          variant="outline"
          onClick={() => {
            setTextA("");
            setTextB("");
            setSubmitted(false);
          }}
        >
          Clear
        </Button>
      </div>

      {submitted && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Result</CardTitle>
              <CardDescription>
                {hasIssues
                  ? "Mismatches found — details below."
                  : "Both texts match perfectly."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Total lines: {result.stats.totalLines}
                </Badge>
                <Badge variant="secondary">
                  Matched: {result.stats.matchedLines}
                </Badge>
                <Badge
                  className={cn(
                    result.stats.modifiedLines > 0 &&
                      "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  )}
                  variant="outline"
                >
                  Mismatched lines: {result.stats.modifiedLines}
                </Badge>
                <Badge
                  className={cn(
                    result.stats.removedLines > 0 &&
                      "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400",
                  )}
                  variant="outline"
                >
                  Missing in B: {result.stats.removedLines}
                </Badge>
                <Badge
                  className={cn(
                    result.stats.addedLines > 0 &&
                      "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
                  )}
                  variant="outline"
                >
                  Extra in B: {result.stats.addedLines}
                </Badge>
                <Badge variant="secondary">
                  Words changed: {result.stats.wordsChanged}
                </Badge>
              </div>

              {!hasIssues ? (
                <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                  ✅ No mistakes found. Text A and Text B are identical, line by
                  line and word by word.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {result.lines.map((line, idx) => (
                    <LineRow key={idx} line={line} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
