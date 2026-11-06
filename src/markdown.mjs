/** Turn embeds into links before Obsidian's renderer can expand them. Keep code literal. */
export function withoutEmbeds(markdown) {
  let result = '', index = 0;
  while (index < markdown.length) {
    if (markdown[index] === '\\') { result += markdown.slice(index, index + 2); index += 2; continue; }
    if (markdown[index] === '`') {
      let length = 1;
      while (markdown[index + length] === '`') length++;
      const marker = '`'.repeat(length);
      let end = index + length;
      for (;;) {
        end = markdown.indexOf(marker, end);
        if (end < 0) break;
        if (markdown[end - 1] !== '`' && markdown[end + length] !== '`') break;
        end += length;
      }
      if (end >= 0) { result += markdown.slice(index, end + length); index = end + length; continue; }
    }
    if (markdown[index] === '!' && markdown[index + 1] === '[') { index++; continue; }
    // Raw media HTML remains visible as literal markup; it must not fetch/expand media.
    if (markdown[index] === '<' && /^<\/?(?:img|video|audio|iframe|object|embed|source|picture)\b/iu.test(markdown.slice(index))) {
      result += '&lt;'; index++; continue;
    }
    result += markdown[index++];
  }
  return result;
}

/** Use Obsidian's existing metadata, without scanning past the excerpt line. */
export function referenceDefinitions(metadata) {
  return (metadata?.referenceLinks ?? []).map(reference => {
    const id = reference.id.replace(/[\\\[\]]/gu, '\\$&').replace(/[\r\n]/gu, ' ');
    const link = reference.link.replace(/>/gu, '%3E').replace(/[\r\n]/gu, '');
    return `[${id}]: <${link}>`;
  }).join('\n');
}
