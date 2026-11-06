import { Component, Keymap, MarkdownRenderer, StringValue } from 'obsidian';
import { referenceDefinitions, withoutEmbeds } from './markdown.mjs';

/** Still a string for formulas; every Bases view can use its public render hook. */
export class ExcerptValue extends StringValue {
  constructor(text, sourcePath, renderer) {
    super(text);
    this.sourcePath = sourcePath;
    this.renderer = renderer;
  }
  equals(other) { return this.data === other.data && this.sourcePath === other.sourcePath; }
  renderTo(el, context) { this.renderer.render(this, el, context); }
}

/** Own Markdown children independently of the view that displays the value. */
export class ExcerptRenderer {
  constructor(plugin) {
    this.plugin = plugin; this.app = plugin.app;
    this.records = new Map(); this.targets = new WeakMap(); this.documents = new Map(); this.active = true;
  }

  render(value, el, context) {
    const previous = this.targets.get(el);
    if (previous) this.release(previous);
    el.empty();
    if (!this.active || !value.data) { el.setText(value.data); return; }
    const doc = el.ownerDocument;
    this.observe(doc);
    const content = el.createDiv({ cls: 'bases-excerpts-value markdown-rendered' });
    const owner = this.plugin.addChild(new Component());
    const record = { owner, target: el, text: value.data };
    this.records.set(content, record);
    this.targets.set(el, content);
    const source = this.app.vault.getFileByPath(value.sourcePath);
    const references = source ? referenceDefinitions(this.app.metadataCache.getFileCache(source)) : '';
    void MarkdownRenderer.render(this.app, withoutEmbeds(value.data) + '\n\n' + references, content, value.sourcePath, owner)
      .catch(error => {
        if (this.active && this.records.get(content) === record) content.setText(value.data);
        console.error('Bases Excerpts: Markdown render failed', error);
      });
    const open = event => {
      if (event.defaultPrevented || (event.button !== 0 && event.button !== 1)) return;
      const link = event.target.closest?.('a.internal-link');
      if (!link || !content.contains(link)) return;
      const href = link.dataset.href ?? link.getAttribute('href');
      if (!href) return;
      event.preventDefault(); event.stopPropagation();
      void this.app.workspace.openLinkText(href, value.sourcePath, Keymap.isModEvent(event));
    };
    owner.registerDomEvent(content, 'click', open);
    owner.registerDomEvent(content, 'auxclick', open);
    owner.registerDomEvent(content, 'mouseover', event => {
      const link = event.target.closest?.('a.internal-link');
      if (link) this.app.workspace.trigger('hover-link', {
        event, source: 'obsidian-bases-excerpts', hoverParent: context, targetEl: link,
        linktext: link.dataset.href ?? link.getAttribute('href'), sourcePath: value.sourcePath,
      });
    });
    this.queuePrune(doc);
  }

  observe(doc) {
    if (this.documents.has(doc)) return;
    const observer = new doc.defaultView.MutationObserver(() => this.queuePrune(doc));
    observer.observe(doc.body, { childList: true, subtree: true });
    this.documents.set(doc, { observer, timer: null });
  }

  queuePrune(doc) {
    const state = this.documents.get(doc);
    if (!state || state.timer !== null) return;
    // Native cells may be built detached and inserted later in the same render pass.
    state.timer = doc.defaultView.setTimeout(() => {
      state.timer = null;
      for (const [content, record] of this.records) {
        if (content.ownerDocument === doc && (!content.isConnected || !record.target.contains(content))) this.release(content);
      }
    }, 0);
  }

  release(content) {
    const record = this.records.get(content);
    if (!record) return;
    this.records.delete(content);
    this.targets.delete(record.target);
    this.plugin.removeChild(record.owner);
  }

  releaseDocument(doc) {
    const state = this.documents.get(doc);
    if (!state) return;
    state.observer.disconnect();
    if (state.timer !== null) doc.defaultView.clearTimeout(state.timer);
    this.documents.delete(doc);
    for (const content of this.records.keys()) if (content.ownerDocument === doc) this.release(content);
  }

  dispose() {
    this.active = false;
    for (const [content, record] of this.records) {
      if (content.isConnected) content.replaceWith(content.ownerDocument.createTextNode(record.text));
      this.release(content);
    }
    for (const doc of this.documents.keys()) this.releaseDocument(doc);
  }
}
