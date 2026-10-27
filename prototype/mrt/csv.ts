export interface SourceRow { row: number; values: Record<string, string> }
export function parseCsv(text: string): { columns: string[]; rows: SourceRow[] } {
  text = text.replace(/^\uFEFF/, '');
  const records: { row: number; cells: string[] }[] = [];
  let cells: string[] = [], value = '', quoted = false, closed = false, line = 1, start = 1;
  const field = () => { cells.push(value); value = ''; closed = false; };
  const record = () => {
    field();
    if (cells.some(v => v !== '') || cells.length > 1) records.push({ row: start, cells });
    cells = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; closed = true; }
      } else { value += c; if (c === '\n') line++; }
      continue;
    }
    if (closed && ![',', '\n', '\r'].includes(c)) throw new Error(`Text after closing quote at line ${line}`);
    if (c === '"') {
      if (value || closed) throw new Error(`Unexpected quote at line ${line}`);
      quoted = true;
    } else if (c === ',') field();
    else if (c === '\n' || c === '\r') {
      record();
      if (c === '\r' && text[i + 1] === '\n') i++;
      line++; start = line;
    } else value += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (value || cells.length || closed) record();
  const columns = records.shift()?.cells ?? [];
  if (!columns.length || columns.some(c => !c) || new Set(columns).size !== columns.length) throw new Error('Missing or duplicate CSV headers');
  return { columns, rows: records.map(r => {
    if (r.cells.length !== columns.length) throw new Error(`CSV width mismatch at line ${r.row}`);
    return { row: r.row, values: Object.fromEntries(columns.map((c, i) => [c, r.cells[i]])) };
  }) };
}
