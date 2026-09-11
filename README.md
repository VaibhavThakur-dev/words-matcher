# Words Matcher

Words Matcher is a text comparison tool built with Next.js, React, Tailwind CSS, and shadcn/ui. It helps you compare two content blocks and instantly shows:

- which lines do not match
- which words are different
- which text is missing or extra
- how many changes were found

It is designed for copy-pasted content from websites, PDFs, documents, or any multilingual source. It works across languages and ignores spacing-only differences so wrapped text does not produce false mismatches.

Live demo: https://words-matcher.vercel.app/

## Why this app exists

A lot of text comparison issues happen because of formatting differences rather than actual content differences. For example:

- line wraps change because the text is displayed in a different width
- extra spaces or trailing spaces appear
- a PDF or website version has slightly different formatting
- the content is in a different language or script

Words Matcher normalizes that noise and focuses on real mismatches.

## Features

- Two text areas for original and comparison text
- Compare button to run the diff
- Line-by-line comparison
- Word-by-word mismatch highlighting
- Unicode-aware text handling for non-English scripts
- Ignores whitespace-only changes
- Keeps values saved in local storage so refresh does not wipe the text
- Clean shadcn-based UI

## Example use cases

- Compare website copy vs approved content
- Check PDF text against source content
- Validate translated content changes
- Find exact wording differences in legal, marketing, or product text

## Tech stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Getting started

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Open the app in your browser:

```text
http://localhost:3000
```

If a different port is assigned by your environment, use that port instead.

## Production build

```bash
npm run build
```

To start the production build locally:

```bash
npm run start
```

## Project structure

```text
app/
components/
lib/
public/
```

- app/: app shell and page layout
- components/: UI and matcher component
- lib/: comparison and diff logic
- public/: static assets

## Notes

The comparison logic is designed to be robust for multilingual text and copy-pasted content from wrapped sources, so it focuses on actual content differences rather than layout-based formatting noise.
