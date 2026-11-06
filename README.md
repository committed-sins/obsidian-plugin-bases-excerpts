# Bases Excerpts

**By:** Committed Sins

**Author:** Michael J. Stallinger

Use the first nonempty content line beneath a chosen Markdown heading as a Bases formula value. Its Markdown and source-relative links render directly in the native Bases table, without requiring a custom view or another plugin.

**Initial release — not yet listed in Community plugins.** Requires Obsidian 1.15.0 or newer and the Bases core plugin. Plugin ID: `bases-excerpts`. MIT licensed. No CodeScript Toolkit or other community plugin is required.

## Installation

Until directory review is complete, download `main.js`, `manifest.json`, and `styles.css` from the [latest GitHub release](https://github.com/committed-sins/obsidian-bases-excerpts/releases/latest). Put the three files in `<vault>/.obsidian/plugins/bases-excerpts/`, restart Obsidian, and enable **Bases Excerpts** under Community plugins. No settings are needed; each formula specifies its heading.

## Usage

Given a note:

```markdown
## About

A **formatted** introduction with [[Related note]] and [a local link](./Related.md).
A later line that is not included in the excerpt.
```

Add a formula to your Base:

```yaml
formulas:
  about: 'basesExcerpt(file, "## About")'
properties:
  formula.about:
    displayName: About
views:
  - type: table
    name: Excerpts
    order:
      - file.name
      - formula.about
    sort:
      - property: formula.about
        direction: ASC
```

Use the native **Table** view and configure visible columns, filters, sorting, grouping, and limits using Bases. Excerpt cells display Markdown with clickable links; other note properties retain their normal editing behavior. Formula cells themselves remain calculated values.

For example, a Bases filter can use `formula.about.contains("introduction")` or `basesExcerpt(file, "## About") != ""`. The formula returns a string containing the original Markdown line, so string functions, filters, and sorting work on that Markdown text. Its rendering hook changes only the display. String transformations that produce a new ordinary string do not retain the excerpt-specific renderer.

The native table retains its fixed row-height settings and can clip long excerpts. For full wrapping and automatically growing rows, optionally enable [Bases Formats](https://github.com/committed-sins/obsidian-bases-formats) and select its **Flexible table** view (`type: bases-formats-table`). That general-purpose view is read-only, with clickable links, and works independently of Excerpts. Excerpts does not register a table view.

The former unreleased `bases-excerpts-table` preview view has been removed. Use `type: table` for native rendering, or `type: bases-formats-table` with Bases Formats for automatic row heights. No Base files are changed automatically.

The heading is a required argument: `basesExcerpt(file, "## About")`. There is no settings page or stored default. Missing, blank, multiline, or marker-only headings produce a formula error. `## About` matches that exact ATX heading level and title; `About` matches that title at any ATX level. Matching is case-sensitive. Setext headings are not supported in this first version.

## Extraction and rendering

- Blank lines after the heading are skipped. The first nonempty physical content line is returned, then parsing stops. Following body lines are never parsed for extraction.
- A missing heading, an empty section, or an immediately following heading produces `""`. With repeated headings, the first matching section wins.
- YAML frontmatter, fenced code blocks, and standalone comments before the selected heading cannot introduce a false heading. Multiline Markdown constructs are limited to the selected physical line.
- Formatting uses Obsidian's Markdown renderer and the formula value's public `renderTo` hook with the source note's path. Internal links open relative to the source note, including modifier/middle clicks and hover previews. External links remain links. Markdown components and listeners are released when cells are reused, detached, or closed, and when the plugin unloads.
- Wiki embeds and Markdown images are converted to ordinary links for display. Raw media HTML is displayed literally. Embedded notes, images, audio, and other media are not expanded. Code remains literal. The formula keeps the original line, including embed syntax.

## Cache and updates

Only requested file/heading pairs are cached in memory. The first lookup starts an asynchronous vault read and briefly returns `""`; once the read completes, the file is requeued in active Bases queries. This also updates filters that initially excluded the empty value, and sorting. Identical concurrent requests share one read. Reads that finish after invalidation, deletion, rename, or unload cannot restore stale content.

File modification invalidates its cached headings and reloads those already requested. Renames and deletions invalidate old paths. The cache is never written into notes or synchronized plugin data. Obsidian still reads the source file as a whole; the plugin's extraction parser stops at the first result.

## Privacy and compatibility

The plugin reads Markdown notes inside the current vault and caches requested excerpts in memory. It does not modify notes, use telemetry, require an account, read files outside the vault, or make network requests. Clicking external links follows Obsidian's normal link behavior. The developer-only deployment script writes release files into the vault explicitly selected by the developer.

Formula registration and asynchronous query refresh currently rely on undocumented Bases APIs, isolated in `src/compat.mjs`. These were tested on desktop Obsidian 1.15.0. Mobile compatibility has not been tested; no Node.js or Electron APIs are bundled in the plugin runtime.

## Development and local deployment

Use Node.js 22 or newer:

```sh
npm ci
npm run check
```

Generated assets are in `dist/`. For a local test vault, set the target outside versioned configuration:

```powershell
$env:OBSIDIAN_VAULT = 'C:\path\to\test-vault'
npm run deploy
```

Optionally set `OBSIDIAN_CONFIG_DIR` to a relative config folder (default `.obsidian`). The config folder must already exist. Deployment rebuilds and tests, copies only `main.js`, `manifest.json`, and `styles.css` into `<config>/plugins/bases-excerpts/`, and preserves `data.json`. Enable/reload the plugin manually. It does not change existing plugins or Base files.

The initial desktop deployment was tested in a local vault on Obsidian 1.15.0. The old formatter remains installed until its separate migration.

## Technical probe and release checks

See [the technical probe and compatibility boundaries](docs/technical-probe.md). Formula registration and formula-cache refresh use small, guarded, undocumented Obsidian interfaces. Markdown rendering uses the public value-rendering API. A future Obsidian update may require a compatibility change. Mobile support is intended but unverified.

Before release, test in a disposable vault: create/modify/delete/rename a source note; a filter excluding empty excerpts; sorting after edits; changing headings; relative links and hover previews from a different folder; wiki and media embeds; grouped Bases; long Markdown at different widths; a second window; reload/unload; and mobile. Verify the note files remain unchanged.

See [release preparation](docs/releasing.md), [name availability](docs/name-check.md), [contributing](CONTRIBUTING.md), and [changelog](CHANGELOG.md).
