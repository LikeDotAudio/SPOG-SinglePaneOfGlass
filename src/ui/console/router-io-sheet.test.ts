// Unit tests for the 1990s‑view workbook serializer/parser + name normalizers.
// Pure — no DOM — so it runs in the default node vitest environment. (The XML READ
// path uses DOMParser and is exercised in the browser; here we round‑trip via CSV,
// assert the SpreadsheetML output shape, and lock the naming rules.)
import { describe, it, expect } from 'vitest';
import { workbookXml, csv, parseCsv, parseWorkbook, columnMap, cleanName, norm, type Sheet } from './router-io-sheet.js';

const sheet: Sheet = {
  name: 'Destinations',
  headers: ['Room', 'Twist', 'Routed Origin', 'Routed Feed'],
  rows: [
    ['PROD 3', 'CAM 1', 'FLOOR 2 — STUDIO A', 'V101-1'],
    ['PROD 3', 'Video Mixer', 'REMOTES', 'REM-2, "spare"'],   // comma + quotes → must be escaped
  ],
};

describe('router-io CSV round‑trip', () => {
  it('escapes and re‑parses commas, quotes and headers', () => {
    const rows = parseCsv(csv(sheet));
    expect(rows[0]).toEqual(sheet.headers);
    expect(rows[1]).toEqual(sheet.rows[0]);
    expect(rows[2]![3]).toBe('REM-2, "spare"');   // the tricky field survives
  });

  it('parseWorkbook routes a CSV to one sheet + columnMap reads by header name', () => {
    const [ws] = parseWorkbook(csv(sheet));
    const col = columnMap(ws!);
    expect(col(ws!.rows[0]!, 'Routed Feed')).toBe('V101-1');
    expect(col(ws!.rows[0]!, 'routed origin')).toBe('FLOOR 2 — STUDIO A');   // case‑insensitive
  });
});

describe('SpreadsheetML output', () => {
  it('emits one Worksheet per sheet with escaped cells', () => {
    const xml = workbookXml([{ name: 'Sources', headers: ['Feed'], rows: [['A & B <x>']] }, sheet]);
    expect(xml).toContain('ss:Name="Sources"');
    expect(xml).toContain('ss:Name="Destinations"');
    expect(xml).toContain('A &amp; B &lt;x&gt;');
    expect((xml.match(/<Worksheet /g) ?? []).length).toBe(2);
  });
});

describe('name normalizers', () => {
  it('cleanName strips order prefixes and leading emoji', () => {
    expect(cleanName('003_CAM 3')).toBe('CAM 3');
    expect(cleanName('📹 CAM 3')).toBe('CAM 3');
    expect(cleanName('0010_PROD 5 PROMPTER')).toBe('PROD 5 PROMPTER');   // 4‑digit prompter prefix
  });
  it('norm makes 📹 CAM 3, 003_CAM 3 and "cam  3" equal', () => {
    expect(norm('📹 CAM 3')).toBe(norm('003_CAM 3'));
    expect(norm('cam  3')).toBe('CAM 3');
  });
});
