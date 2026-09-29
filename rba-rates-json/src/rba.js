// Parse the RBA's published CSV statistical tables and turn them into tidy rows.
// Table layout (F11.1, A2): a title line, header lines (Title, Description, Frequency, Type, Units, Source,
// Publication date, Series ID), then one row per date: "dd-Mon-yyyy,value,value,...".

const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

export const SOURCES = {
  'exchange-rates': { url: 'https://www.rba.gov.au/statistics/tables/csv/f11.1-data.csv', table: 'F11.1', page: 'https://www.rba.gov.au/statistics/frequency/exchange-rates.html' },
  'cash-rate-target': { url: 'https://www.rba.gov.au/statistics/tables/csv/a2-data.csv', table: 'A2', page: 'https://www.rba.gov.au/statistics/cash-rate/' },
};

export function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function isoDate(s) {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(s).trim());
  if (!m || !MONTHS[m[2]]) return null;
  return `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, '0')}`;
}

export function parseTable(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const header = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const key = cells[0].trim();
    if (['Title', 'Description', 'Frequency', 'Type', 'Units', 'Source', 'Publication date', 'Series ID'].includes(key)) header[key] = cells.slice(1);
    if (key === 'Series ID') { i++; break; }
  }
  if (!header['Series ID'] || !header.Title) throw new Error('Unexpected RBA table layout: header lines not found');
  const rows = [];
  for (; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = parseCsvLine(lines[i]);
    const date = isoDate(cells[0]);
    if (date) rows.push({ date, cells: cells.slice(1) });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { header, rows };
}

function currencyCode(title) {
  const m = /^A\$1=([A-Z]{3})$/.exec(title.trim());
  if (m) return m[1];
  if (/trade-weighted/i.test(title)) return 'TWI';
  return null;
}

function toNumber(s) {
  if (s === undefined || s === null || String(s).trim() === '') return null;
  const n = Number(String(s).trim());
  return Number.isFinite(n) ? n : null;
}

export function shiftDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function attribution(table) {
  const pub = (table.header['Publication date'] || []).map(isoDate).filter(Boolean).sort().pop();
  const year = pub ? pub.slice(0, 4) : String(new Date().getUTCFullYear());
  return `Source: Reserve Bank of Australia ${year}`;
}

export function availableCurrencies(table) {
  return table.header.Title.map(currencyCode).filter(Boolean);
}

/** @returns {{rows: object[], unknown: string[]}} */
export function exchangeRows(table, { currencies = [], latestOnly = true, dateFrom, dateTo, maxItems = 1000 } = {}) {
  const titles = table.header.Title;
  const cols = [];
  titles.forEach((t, idx) => {
    const code = currencyCode(t);
    if (code) cols.push({ idx, code, unit: (table.header.Units || [])[idx], seriesId: (table.header['Series ID'] || [])[idx], dataSource: (table.header.Source || [])[idx] });
  });
  const wanted = currencies.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
  const unknown = wanted.filter((c) => !cols.some((x) => x.code === c));
  const use = wanted.length ? cols.filter((c) => wanted.includes(c.code)) : cols;
  const attr = attribution(table);
  const mk = (row, c, value) => ({
    date: row.date,
    base: 'AUD',
    quote: c.code === 'TWI' ? 'TWI' : c.code,
    rate: value,
    seriesId: c.seriesId || null,
    dataSource: c.dataSource || null,
    unit: c.code === 'TWI' ? 'Index, May 1970 = 100' : `${c.code} per A$1`,
    attribution: attr,
  });
  const inRange = table.rows.filter((r) => (!dateTo || r.date <= dateTo));
  if (latestOnly) {
    const out = [];
    for (const c of use) {
      for (let k = inRange.length - 1; k >= 0; k--) {
        const v = toNumber(inRange[k].cells[c.idx]);
        if (v !== null) { out.push(mk(inRange[k], c, v)); break; }
      }
    }
    return { rows: out.slice(0, maxItems), unknown };
  }
  const newest = inRange.length ? inRange[inRange.length - 1].date : null;
  const from = dateFrom || (newest ? shiftDays(newest, -30) : '0000-00-00');
  const out = [];
  for (const r of inRange) {
    if (r.date < from) continue;
    for (const c of use) {
      const v = toNumber(r.cells[c.idx]);
      if (v !== null) out.push(mk(r, c, v));
    }
  }
  return { rows: out.slice(0, maxItems), unknown };
}

export function cashRateRows(table, { latestOnly = true, dateFrom, dateTo, maxItems = 1000 } = {}) {
  const attr = attribution(table);
  const mk = (r) => {
    const text = (r.cells[1] ?? '').trim();
    return {
      date: r.date,
      changePercentagePoints: (r.cells[0] ?? '').trim() || null,
      newCashRateTargetPercent: toNumber(text),
      newCashRateTargetText: text || null,
      attribution: attr,
    };
  };
  let rows = table.rows.filter((r) => (r.cells[1] ?? '').trim() !== '');
  if (dateTo) rows = rows.filter((r) => r.date <= dateTo);
  if (latestOnly) return { rows: rows.slice(-1).map(mk), unknown: [] };
  const newest = rows.length ? rows[rows.length - 1].date : null;
  const from = dateFrom || (newest ? shiftDays(newest, -365 * 2) : '0000-00-00');
  return { rows: rows.filter((r) => r.date >= from).map(mk).slice(0, maxItems), unknown: [] };
}
