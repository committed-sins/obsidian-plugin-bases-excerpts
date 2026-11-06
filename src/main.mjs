import { Notice, Plugin, PluginSettingTab, Setting, StringValue, TFile } from 'obsidian';
import { ExcerptCache } from './cache.mjs';
import { refreshFileInBases, registerExcerptFormula } from './compat.mjs';
import { ExcerptsTable } from './view.mjs';

class ExcerptValue extends StringValue {
  constructor(text, sourcePath) { super(text); this.sourcePath = sourcePath; }
}

export default class BasesExcerpts extends Plugin {
  async onload() {
    const saved = await this.loadData();
    this.heading = typeof saved?.heading === 'string' && saved.heading.trim() ? saved.heading.trim() : '## About';
    this.active = true; this.pendingRefresh = new Map(); this.refreshTimer = null; this.warned = false;
    this.cache = new ExcerptCache(file => this.app.vault.cachedRead(file), file => this.scheduleRefresh(file), error => console.error('Bases Excerpts: read failed', error));
    this.register(() => {
      this.active = false; this.cache.dispose();
      if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
      this.pendingRefresh.clear();
    });
    const changed = file => {
      if (!(file instanceof TFile) || file.extension !== 'md') return;
      const headings = this.cache.invalidate(file.path);
      // Warm every previously requested heading before requeueing dependent formulas.
      for (const heading of headings) void this.cache.load(file, heading).catch(error => console.error('Bases Excerpts: refresh failed', error));
    };
    this.registerEvent(this.app.vault.on('modify', changed));
    this.registerEvent(this.app.vault.on('delete', file => {
      this.cache.invalidate(file.path); this.pendingRefresh.delete(file.path);
    }));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      this.cache.invalidate(oldPath); this.pendingRefresh.delete(oldPath); changed(file);
    }));
    registerExcerptFormula(this, (file, heading) => {
      if (!(file instanceof TFile) || file.extension !== 'md') return new ExcerptValue('', file?.path ?? '');
      const target = typeof heading === 'string' ? heading : this.heading;
      return new ExcerptValue(this.cache.get(file, target), file.path);
    });
    const registered = this.registerBasesView('bases-excerpts-table', {
      name: 'Excerpts table', icon: 'text-select',
      factory: (controller, el) => new ExcerptsTable(controller, el, value => value instanceof ExcerptValue),
      options: () => [{ type: 'slider', key: 'columnWidth', displayName: 'Column width', default: 280, min: 100, max: 800, step: 20 }],
    });
    if (!registered) new Notice('Bases Excerpts: enable the Bases core plugin, then reload Bases Excerpts.');
    this.addSettingTab(new ExcerptsSettings(this.app, this));
  }
  scheduleRefresh(file) {
    if (!this.active) return;
    this.pendingRefresh.set(file.path, file);
    if (this.refreshTimer !== null) return;
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      const files = [...this.pendingRefresh.values()]; this.pendingRefresh.clear();
      for (const pending of files) {
        if (this.app.vault.getFileByPath(pending.path) !== pending) continue;
        if (!refreshFileInBases(this.app, pending) && !this.warned) {
          this.warned = true;
          new Notice('Bases Excerpts: this Obsidian version does not support automatic formula refresh. Reopen the Base and check for a plugin update.');
        }
      }
    }, 30);
  }
  async setHeading(heading) {
    this.heading = heading.trim() || '## About';
    await this.saveData({ heading: this.heading });
    for (const path of [...this.cache.entries.keys()]) {
      this.cache.invalidate(path);
      const file = this.app.vault.getFileByPath(path);
      if (file) this.scheduleRefresh(file);
    }
  }
}

class ExcerptsSettings extends PluginSettingTab {
  display() {
    this.containerEl.empty();
    new Setting(this.containerEl).setName('Default heading')
      .setDesc('Use ## About for an exact heading level, or About to match any ATX heading level. A formula can override this setting.')
      .addText(text => text.setValue(this.plugin.heading).onChange(value => { this.pending = value; }));
    new Setting(this.containerEl).addButton(button => button.setButtonText('Save heading').onClick(() => { void this.plugin.setHeading(this.pending ?? this.plugin.heading); }));
  }
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
}
