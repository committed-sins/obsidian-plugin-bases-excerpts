/** Iterate without allocating/splitting the rest of a potentially large note. */
export function* linesOf(text) {
  let start = 0;
  while (start < text.length) {
    const end = text.indexOf('\n', start);
    if (end === -1) { yield text.slice(start).replace(/\r$/u, ''); return; }
    yield text.slice(start, end).replace(/\r$/u, '');
    start = end + 1;
  }
}

export function headingSpec(heading) {
  const trimmed = heading.trim();
  const match = /^(#{1,6})[\t ]+(.+?)(?:[\t ]+#+)?[\t ]*$/u.exec(trimmed);
  return match ? { level: match[1].length, title: match[2].trim() } : { level: null, title: trimmed };
}

/** First physical nonempty content line; any following heading ends an empty section. */
export function extractFirstLine(text, heading = '## About') {
  return extractFromLines(linesOf(text), heading);
}

export function extractFromLines(lines, heading = '## About') {
  const target = headingSpec(heading);
  if (!target.title) return '';
  let first = true, frontmatter = false, fence = null, found = false, comment = null;
  for (const raw of lines) {
    const line = raw.replace(/^\uFEFF/u, '');
    if (first) { first = false; if (line.trim() === '---') { frontmatter = true; continue; } }
    if (frontmatter) { if (/^(---|\.\.\.)\s*$/u.test(line)) frontmatter = false; continue; }
    // Comments and fenced code before the target cannot introduce headings.
    if (!found) {
      if (comment) { if (line.includes(comment)) comment = null; continue; }
      const commentStart = /^\s*(<!--|%%)/u.exec(line);
      if (commentStart) {
        const end = commentStart[1] === '<!--' ? '-->' : '%%';
        if (!line.slice(commentStart[0].length).includes(end)) comment = end;
        continue;
      }
      const code = /^ {0,3}(`{3,}|~{3,})/u.exec(line);
      if (fence) { if (code && code[1][0] === fence[0] && code[1].length >= fence.length && /^ {0,3}(?:`+|~+)\s*$/u.test(line)) fence = null; continue; }
      if (code) { fence = code[1]; continue; }
    }
    const headingMatch = /^ {0,3}(#{1,6})(?:[\t ]+(.+?)|[\t ]*)(?:[\t ]+#+)?[\t ]*$/u.exec(line);
    if (headingMatch) {
      if (found) return '';
      const level = headingMatch[1].length;
      const title = (headingMatch[2] ?? '').replace(/[\t ]+#+[\t ]*$/u, '').trim();
      if ((target.level === null || level === target.level) && title === target.title) found = true;
      continue;
    }
    if (found && line.trim()) return line.trim();
  }
  return '';
}
