// src/ui/console/router-io-sheet — the workbook serializer/parser for the 1990s
// view import/export (audit: docs/Audit/1990s-View-Import-Export-Audit.md §5).
//
// Format = SpreadsheetML 2003 (.xml): a single file with multiple <Worksheet>s that
// Excel/LibreOffice open as real tabs — dependency‑free to WRITE (a template string)
// and to READ (the built‑in DOMParser). CSV is the universal per‑tab convenience.
// Pure + unit‑testable: no DOM scraping, no app state.

export interface Sheet {
  name: string;
  headers: string[];
  rows: string[][];
}

const xmlEsc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cell(v: string): string {
  return `<Cell><Data ss:Type="String">${xmlEsc(v ?? '')}</Data></Cell>`;
}
function row(cells: string[]): string {
  return `<Row>${cells.map(cell).join('')}</Row>`;
}

/** Serialize sheets to a SpreadsheetML 2003 workbook (opens as multi‑tab in Excel). */
export function workbookXml(sheets: Sheet[]): string {
  const ws = sheets.map((s) => {
    const body = [row(s.headers), ...s.rows.map(row)].join('');
    return `<Worksheet ss:Name="${xmlEsc(s.name)}"><Table>${body}</Table></Worksheet>`;
  }).join('');
  return `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n`
    + `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"`
    + ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${ws}</Workbook>`;
}

// ---- CSV (RFC‑4180, quote‑aware) -------------------------------------------
const csvField = (v: string): string =>
  /[",\n]/.test(v ?? '') ? `"${(v ?? '').replace(/"/g, '""')}"` : (v ?? '');

/** One sheet as CSV text (header row + data rows). */
export function csv(sheet: Sheet): string {
  return [sheet.headers, ...sheet.rows].map((r) => r.map(csvField).join(',')).join('\r\n');
}

/** Parse CSV text → rows of fields. Handles quoted fields with commas/quotes/newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '', rec: string[] = [], inQ = false;
  const t = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (inQ) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { rec.push(field); field = ''; }
    else if (c === '\n') { rec.push(field); rows.push(rec); rec = []; field = ''; }
    else field += c;
  }
  if (field.length || rec.length) { rec.push(field); rows.push(rec); }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** Parse a workbook file's text (SpreadsheetML .xml OR CSV) into sheets. A CSV yields
 *  ONE sheet named from its content, so the caller routes it by its headers. */
export function parseWorkbook(text: string): Sheet[] {
  const t = text.trimStart();
  if (!/^<\?xml|^<\?mso|^<Workbook/i.test(t)) {
    const rows = parseCsv(text);
    const headers = rows.shift() ?? [];
    return [{ name: 'CSV', headers, rows }];
  }
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const sheets: Sheet[] = [];
  for (const wsEl of Array.from(doc.getElementsByTagName('Worksheet'))) {
    const name = wsEl.getAttribute('ss:Name') || wsEl.getAttribute('Name') || 'Sheet';
    const grid: string[][] = [];
    for (const rowEl of Array.from(wsEl.getElementsByTagName('Row'))) {
      const cells: string[] = [];
      let col = 0;
      for (const cEl of Array.from(rowEl.getElementsByTagName('Cell'))) {
        const idx = cEl.getAttribute('ss:Index');
        if (idx) { const n = Number(idx) - 1; while (col < n) { cells.push(''); col++; } }
        const data = cEl.getElementsByTagName('Data')[0];
        cells.push(data?.textContent ?? ''); col++;
      }
      grid.push(cells);
    }
    const headers = grid.shift() ?? [];
    sheets.push({ name, headers, rows: grid });
  }
  return sheets;
}

/** Index a sheet's columns by header name (case/space‑insensitive) → row accessor. */
export function columnMap(sheet: Sheet): (row: string[], header: string) => string {
  const key = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const idx = new Map<string, number>();
  sheet.headers.forEach((h, i) => idx.set(key(h), i));
  return (r, header) => r[idx.get(key(header)) ?? -1] ?? '';
}

// ---- broadcast name normalizers (pure — shared by export display + import match) ----
const stripOrder = (s: string): string => s.replace(/^\d{3,}_/, '');           // filename order prefix
const stripLead = (s: string): string => s.replace(/^[^\p{L}\p{N}]+/u, '');    // leading emoji/glyph
/** Human display name: order prefix + leading emoji removed. */
export const cleanName = (s: string): string => stripLead(stripOrder((s || '').trim())).trim();
/** Match key: cleaned, upper, whitespace‑collapsed — so `📹 CAM 3` == `003_CAM 3` == `cam 3`. */
export const norm = (s: string): string => cleanName(s).toUpperCase().replace(/\s+/g, ' ').trim();
