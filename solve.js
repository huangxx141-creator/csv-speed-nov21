// Read contiguous spans as slices. Only escaped quotes and discarded CRs
// need string assembly. Each call owns its scan positions and result arrays.
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const rows = [];
  const errors = [];
  const quoteEvents = /["\r\n]/g;
  let columns = header ? [] : null;
  let width = -1;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  const boundaries = /[,\r\n]/g;
  const end = text.length;

  while (pos < end) {
    const recordLine = line;
    const row = header && width < 0 ? null : rows.length;
    const fields = width < 0 ? [] : new Array(width);
    let fieldCount = 0;
    let quoted;
    let delimiter;
    do {
      quoted = text.charCodeAt(pos) === 34;
      if (!quoted) {
        const from = pos;
        boundaries.lastIndex = pos;
        pos = boundaries.test(text) ? boundaries.lastIndex - 1 : end;
        delimiter = text.charCodeAt(pos);
        if (delimiter !== 13 || text.charCodeAt(pos + 1) === 10) {
          fields[fieldCount++] = text.slice(from, pos);
          pos += delimiter === 13 ? 2 : 1;
          continue;
        }
        // Re-read a malformed unquoted field to record each discarded CR.
        pos = from;
      }
      let prefix = '';
      let start = pos;
      let closed = false;
      if (quoted) {
        const open = pos;
        const savedLine = line;
        start = ++pos;
        quoteEvents.lastIndex = pos;
        while (quoteEvents.test(text)) {
          pos = quoteEvents.lastIndex;
          const c = text.charCodeAt(pos - 1);
          if (c === 34) {
            prefix += text.slice(start, pos - 1);
            if (text.charCodeAt(pos) !== 34) {
              closed = true;
              start = pos;
              break;
            }
            start = pos;
            pos++;
            quoteEvents.lastIndex = pos;
          } else if (c === 13) {
            prefix += text.slice(start, pos - 1) + '\n';
            if (text.charCodeAt(pos) === 10) pos++;
            start = pos;
            quoteEvents.lastIndex = pos;
            line++;
          } else if (c === 10) {
            line++;
          }
        }
        if (!closed) {
          errors.push({code: 'unterminated_quote', line: recordLine, row});
          // Roll back physical line counts when replaying the opening quote literally.
          line = savedLine;
          pos = open + 1;
          start = open;
          prefix = '';
        }
      }
      let junk = false;
      for (;;) {
        delimiter = text.charCodeAt(pos);
        if (delimiter === 44 || delimiter === 10 || pos >= end) break;
        if (delimiter === 13) {
          if (text.charCodeAt(pos + 1) === 10) break;
          errors.push({code: 'stray_cr', line: recordLine, row});
          prefix += text.slice(start, pos++);
          start = pos;
        } else {
          if (closed) junk = true;
          pos++;
        }
      }
      if (junk) errors.push({code: 'quote_junk', line: recordLine, row});
      fields[fieldCount++] = prefix + text.slice(start, pos);
      if (delimiter === 13) pos++;
      pos++;
    } while (delimiter === 44);
    if (delimiter === 13 || delimiter === 10) line++;
    if (fieldCount < fields.length) fields.length = fieldCount;
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    if (width < 0) {
      width = fields.length;
      if (header) {
        columns = fields;
        continue;
      }
    }
    if (fields.length < width) {
      errors.push({code: 'short_row', line: recordLine, row, fields: fields.length});
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({code: 'long_row', line: recordLine, row, extra: fields.splice(width)});
    }
    rows.push(fields);
  }
  return {columns, rows, errors};
}
