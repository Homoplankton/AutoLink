# AutoLink

An [Obsidian](https://obsidian.md) plugin that automatically detects and inserts internal links to existing notes, reducing redundancy and manual effort during note-taking.

## The Problem

When writing notes, you often reference concepts that already have their own notes — but small differences in wording (capitalization, plurals, phrasing) cause you to miss the connection. This leads to:

- Duplicate or fragmented notes about the same concept
- Inconsistent linking across your knowledge base
- Manual cleanup work after writing

## How It Works

Run the **"AutoLink: Link current note"** command from the command palette. The plugin scans your current note for terms that match the titles of other notes in the same folder and automatically converts them into `[[internal links]]`.

### Example

Given a folder with notes named `Plankton.md` and `Cell Biology.md`, writing:

```
Plankton are organisms that drift in the ocean. Understanding cell biology
helps explain how plankton cells function.
```

After running the command becomes:

```
[[Plankton]] are organisms that drift in the ocean. Understanding [[Cell Biology|cell biology]]
helps explain how [[Plankton|plankton]] cells function.
```

### Matching Features

- **Case-insensitive** — "plankton" matches the note `Plankton.md`
- **Plural-aware** — "cells" matches `Cell.md`, "categories" matches `Category.md`
- **Longest-match-first** — "Cell Biology" is matched before "Cell" to avoid partial links
- **First occurrence only** — each note title is linked once to avoid cluttering the text
- **Display text preserved** — when the matched text differs from the note title (e.g., different case or plural form), the original wording is kept via `[[Note Title|matched text]]`

### Protected Regions

The plugin never inserts links inside:

- Existing `[[wiki links]]`
- YAML frontmatter (`---` blocks)
- Inline code (`` `backticks` ``)
- Fenced code blocks (` ``` `)

## Settings

| Setting | Default | Description |
|---|---|---|
| Case sensitive | Off | When on, "Plankton" won't match "plankton" |
| Ignore plurals | On | Treats singular and plural forms as equivalent |

## Scope

By default, AutoLink only matches notes within the **current folder** — not the entire vault. This keeps linking precise and relevant to the context you're working in.

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Homoplankton/AutoLink/releases)
2. Create a folder called `autolink` in your vault's `.obsidian/plugins/` directory
3. Place the downloaded files into that folder
4. Open Obsidian Settings → Community Plugins → Enable "AutoLink"

### Build from Source

```bash
git clone https://github.com/Homoplankton/AutoLink.git
cd AutoLink
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/autolink/` directory.

## Usage

1. Open a note in your vault
2. Open the command palette (`Ctrl/Cmd + P`)
3. Run **"AutoLink: Link current note"**
4. Links are inserted automatically

## Future Enhancements

- Customizable fuzzy matching sensitivity
- Suggestion mode (preview matches before inserting)
- Frontmatter alias recognition
- Vault-wide scope option

## License

MIT
