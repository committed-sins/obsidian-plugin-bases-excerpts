# Changelog

## 0.1.0 — 2026-11-06

- Use `bases-excerpts` as the internal plugin ID and installation directory, distinct from the repository name `obsidian-bases-excerpts`; validate the official ID naming rules during builds.

- Render Markdown and source-relative links through the formula value in the native table and compatible custom views.
- Move the optional table view to Bases Formats; Excerpts no longer owns a view or requires another community plugin.

- Initial standalone implementation, build, local deployment tooling, and automated checks.
- Require the heading in every formula; remove the settings page and stored defaults. Cache entries remain scoped to source file and heading.
- Initial public GitHub release. Community directory submission and review are separate steps.
