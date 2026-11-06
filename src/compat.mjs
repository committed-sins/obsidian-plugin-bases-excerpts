import { FileValue, QueryController, StringValue } from 'obsidian';

/** Undocumented Obsidian 1.15 API. Keep all private Bases integration here. */
export function registerExcerptFormula(plugin, evaluate) {
  if (typeof plugin.registerGlobalFunc !== 'function') throw Error('Bases Excerpts requires Obsidian 1.15 with formula registration support.');
  const fn = {
    name: 'basesExcerpt', ctx: null,
    docString: 'First nonempty line beneath a heading. Defaults to the configured heading (## About).',
    params: [
      { name: 'source', type: [FileValue], optional: false, variadic: false },
      { name: 'heading', type: [StringValue], optional: true, variadic: false },
    ],
    apply(source, heading) { return evaluate(source?.file, heading?.data); },
    applyWithContext(ctx, ...args) {
      const previous = this.ctx; this.ctx = ctx;
      try { return this.apply(...args); } finally { this.ctx = previous; }
    },
    serialize(...args) { return `basesExcerpt(${args.join(', ')})`; },
  };
  plugin.registerGlobalFunc(fn);
}

/** Requeue the file even if an excerpt filter excluded it from current results. */
export function refreshFileInBases(app, file) {
  const seen = new Set();
  let supported = true;
  const visit = component => {
    if (!component || seen.has(component)) return;
    seen.add(component);
    if (component instanceof QueryController) {
      if (typeof component.queue?.onFileChanged === 'function') component.queue.onFileChanged(file);
      else supported = false;
    }
    for (const child of component._children ?? []) visit(child);
  };
  app.workspace.iterateAllLeaves(leaf => visit(leaf.view));
  return supported;
}
