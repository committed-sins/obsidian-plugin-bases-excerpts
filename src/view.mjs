import { BasesView, Component, Keymap, MarkdownRenderer, RenderContext } from 'obsidian';
import { referenceDefinitions, withoutEmbeds } from './markdown.mjs';

export class ExcerptsTable extends BasesView {
  constructor(controller, containerEl, isExcerpt) {
    super(controller);
    this.type = 'bases-excerpts-table'; this.containerEl = containerEl;
    this.isExcerpt = isExcerpt; this.renderOwner = null;
  }
  onDataUpdated() {
    if (this.renderOwner) this.removeChild(this.renderOwner);
    this.renderOwner = this.addChild(new Component());
    const owner = this.renderOwner;
    const root = this.containerEl;
    root.empty();
    const table = root.createEl('table', { cls: 'bases-excerpts-table' });
    const widthSetting = this.config.get('columnWidth');
    const width = typeof widthSetting === 'number' ? Math.max(100, Math.min(800, widthSetting)) : 280;
    const properties = this.config.getOrder();
    if (!properties.length) { root.createDiv({ text: 'Select properties to display.' }); return; }
    table.style.width = `${width * properties.length}px`;
    const columns = table.createEl('colgroup');
    for (const _ of properties) columns.createEl('col').style.width = `${width}px`;
    const header = table.createEl('thead').createEl('tr');
    for (const property of properties) header.createEl('th', { text: this.config.getDisplayName(property), attr: { scope: 'col' } });
    const renderContext = new RenderContext(this.app);
    for (const group of this.data.groupedData) {
      const body = table.createEl('tbody');
      if (group.hasKey()) body.createEl('tr', { cls: 'bases-excerpts-group' }).createEl('th', {
        text: group.key.toString(), attr: { colspan: String(properties.length), scope: 'rowgroup' },
      });
      for (const entry of group.entries) {
        const row = body.createEl('tr');
        for (const property of properties) {
          const cell = row.createEl('td', { attr: {
            'data-property': property, 'data-display-name': this.config.getDisplayName(property),
          } });
          try {
            const value = entry.getValue(property);
            if (this.isExcerpt(value)) {
              cell.addClass('bases-excerpts-markdown', 'markdown-rendered');
              const content = cell.createDiv();
              // A per-cell component owns any Markdown postprocessor children.
              const child = owner.addChild(new Component());
              const source = this.app.vault.getFileByPath(value.sourcePath);
              const references = source ? referenceDefinitions(this.app.metadataCache.getFileCache(source)) : '';
              void MarkdownRenderer.render(this.app, withoutEmbeds(value.data) + '\n\n' + references, content, value.sourcePath, child)
                .catch(error => { if (this.renderOwner === owner) content.setText(value.data); console.error('Bases Excerpts: Markdown render failed', error); });
              owner.registerDomEvent(content, 'click', event => this.openSourceLink(event, content, value.sourcePath));
              owner.registerDomEvent(content, 'auxclick', event => this.openSourceLink(event, content, value.sourcePath));
              owner.registerDomEvent(content, 'mouseover', event => {
                const link = event.target.closest?.('a.internal-link');
                if (link) this.app.workspace.trigger('hover-link', { event, source: 'bases-excerpts', hoverParent: renderContext, targetEl: link, linktext: link.dataset.href ?? link.getAttribute('href'), sourcePath: value.sourcePath });
              });
            } else value?.renderTo(cell, renderContext);
          } catch (error) { cell.setText(error instanceof Error ? error.message : String(error)); }
        }
      }
    }
  }
  openSourceLink(event, content, sourcePath) {
    if (event.defaultPrevented || (event.button !== 0 && event.button !== 1)) return;
    const link = event.target.closest?.('a.internal-link');
    if (!link || !content.contains(link)) return;
    const href = link.dataset.href ?? link.getAttribute('href');
    if (!href) return;
    event.preventDefault(); event.stopPropagation();
    void this.app.workspace.openLinkText(href, sourcePath, Keymap.isModEvent(event));
  }
}
