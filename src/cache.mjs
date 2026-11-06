import { extractFirstLine } from './extract.mjs';

/** Lazy per-file/per-heading memoization with single-flight reads and race protection. */
export class ExcerptCache {
  constructor(read, onReady, onError = console.error) {
    this.read = read; this.onReady = onReady; this.onError = onError;
    this.entries = new Map(); this.epochs = new Map(); this.disposed = false;
  }
  get(file, heading) {
    const record = this.entries.get(file.path)?.get(heading);
    if (record?.ready) return record.value;
    void this.load(file, heading).catch(this.onError);
    return '';
  }
  load(file, heading) {
    if (this.disposed) return Promise.resolve('');
    let headings = this.entries.get(file.path);
    if (!headings) this.entries.set(file.path, headings = new Map());
    const existing = headings.get(heading);
    if (existing) return existing.promise;
    const path = file.path;
    const epoch = this.epochs.get(path) ?? 0;
    const record = { ready: false, value: '', promise: null };
    headings.set(heading, record);
    record.promise = this.read(file).then(text => {
      if (this.disposed || file.path !== path || epoch !== (this.epochs.get(path) ?? 0) || this.entries.get(path) !== headings) return '';
      record.value = extractFirstLine(text, heading); record.ready = true;
      this.onReady(file);
      return record.value;
    }).catch(error => {
      // Allow a later evaluation to retry transient read errors.
      if (headings.get(heading) === record) headings.delete(heading);
      throw error;
    });
    return record.promise;
  }
  invalidate(path) {
    this.epochs.set(path, (this.epochs.get(path) ?? 0) + 1);
    const headings = [...(this.entries.get(path)?.keys() ?? [])];
    this.entries.delete(path);
    return headings;
  }
  dispose() { this.disposed = true; this.entries.clear(); this.epochs.clear(); }
}
