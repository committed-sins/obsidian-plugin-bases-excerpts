# Formula registration and dynamic row-height probe

On 2026-11-06 a temporary in-memory probe ran inside Obsidian **1.15.0** through its enabled CLI. It installed no plugin files and changed no notes or Base definitions. Its function registration and offscreen DOM elements were removed in a finally block.

Observed results:

| Check | Result |
| --- | --- |
| Plugin.prototype.registerGlobalFunc exists | Yes |
| Custom function registered and evaluated through the actual Bases expression evaluator | Yes |
| Result is an Obsidian StringValue | Yes |
| `.contains("formatted")` in a real Bases filter accepts the function's result | Yes |
| Markdown renderer creates strong text and a source-relative internal link | Yes |
| Normal table cell height at 180 px width | 324.5 px |
| Same content at 90 px width | 656 px |
| Temporary test DOM removed | Confirmed |

Inspection of the installed application's native table code showed a common row height calculated as the base row height times the selected height multiplier. Merely changing cell CSS would not update its virtualized row positions. The approved implementation therefore provides the separate **Excerpts table** Bases view with natural table layout.

The probe establishes feasibility. It does **not** establish that the complete plugin has passed live acceptance, mobile compatibility, or large-vault performance tests. Those remain pre-release checks.

## Undocumented integration

All private Bases access is isolated in `src/compat.mjs`:

- `Plugin.registerGlobalFunc` registers `basesExcerpt`, with Obsidian-compatible argument metadata, serialization, and context restoration. The owning plugin removes it on unload.
- `QueryController.queue.onFileChanged(file)` requeues an asynchronously completed excerpt read so filters and sorts are evaluated again, including previously excluded files. Controllers are located through workspace leaf component children (`_children`). No synthetic vault or metadata-change event is emitted and no note is modified.

Registration fails with a clear error if the function-registration API is unavailable. If a discovered controller lacks the refresh hook, the plugin shows a compatibility notice once. Reopening a Base can recreate its query results, but updating the compatibility adapter is required for automatic refresh on an incompatible Obsidian version.

The registration shape was independently checked against [Obsidian Lib's formula-function implementation](https://github.com/mnaoumov/obsidian-lib/blob/main/src/formula-function.ts); that package is not a dependency and its code is not bundled. Public view/value contracts follow the [official Obsidian API](https://github.com/obsidianmd/obsidian-api).
