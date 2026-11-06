(async () => {
  const o = require('obsidian');
  const seen = new Set(); let controller;
  function scan(c) {
    if (!c || seen.has(c)) return;
    seen.add(c);
    if (!controller && c instanceof o.QueryController && c.query) controller = c;
    for (const child of c._children ?? []) scan(child);
  }
  app.workspace.iterateAllLeaves(l => scan(l.view));
  if (!controller) throw Error('Open a Base before running the probe.');
  const owner = new o.Component(); owner.load();
  const host = document.body.createDiv();
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:180px;visibility:hidden';
  let calls = 0;
  const fn = {
    name: 'basesExcerptProbe', ctx: null,
    params: [
      {name:'source',type:[o.FileValue],optional:false,variadic:false},
      {name:'heading',type:[o.StringValue],optional:false,variadic:false},
    ],
    apply(source, heading) { calls++; return new o.StringValue('A **formatted** excerpt from ' + heading.data); },
    applyWithContext(ctx, ...args) { const previous=this.ctx; this.ctx=ctx; try{return this.apply(...args);}finally{this.ctx=previous;} },
    serialize(...args) {return this.name+'('+args.join(', ')+')';},
  };
  try {
    o.Plugin.prototype.registerGlobalFunc.call(owner, fn);
    const query = controller.query.constructor.fromString(`filters: 'basesExcerptProbe(file, "## About").contains("formatted")'\nformulas:\n  probe: 'basesExcerptProbe(file, "## About")'\nviews:\n  - type: table\n    name: Probe\n    order: [formula.probe]\n    sort:\n      - property: formula.probe\n        direction: ASC\n`);
    const ctx = controller.buildBasesContext.call({app,query,currentFile:null});
    const file = app.vault.getMarkdownFiles()[0];
    const entry = new o.BasesEntry(ctx,file);
    const value = entry.getValue('formula.probe');
    const filter = ctx.filter.test(entry);
    const table = host.createEl('table'); table.style.cssText='width:180px;table-layout:fixed;border-collapse:collapse';
    const td=table.createEl('tr').createEl('td');td.style.cssText='white-space:normal;overflow-wrap:anywhere';
    await o.MarkdownRenderer.render(app,'**Formatted** [link](./relative.md) '+('wrapping content '.repeat(15)),td,file.path,owner);
    const before=td.getBoundingClientRect().height;
    table.style.width='90px';
    // Layout measurements force synchronous reflow, including when the app is hidden.
    const after=td.getBoundingClientRect().height;
    const result={obsidian:o.apiVersion,formulaRegistered:calls>0,stringValue:value instanceof o.StringValue,formulaText:value.toString(),filterMatched:filter,renderedStrong:!!td.querySelector('strong'),renderedLink:!!td.querySelector('a'),heightAt180:before,heightAt90:after,dynamicRows:after>before};
    if(!result.formulaRegistered||!result.stringValue||!filter||!result.dynamicRows)throw Error(JSON.stringify(result));
    return JSON.stringify(result);
  } finally { owner.unload(); host.remove(); }
})()
