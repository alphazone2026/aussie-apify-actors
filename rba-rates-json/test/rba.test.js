import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attribution, availableCurrencies, cashRateRows, exchangeRows, isoDate, parseCsvLine, parseTable } from '../src/rba.js';

const fx = parseTable(readFileSync(new URL('./f11.1-fixture.csv', import.meta.url), 'utf8'));
const a2 = parseTable(readFileSync(new URL('./a2-fixture.csv', import.meta.url), 'utf8'));

test('dates and csv lines', () => {
  assert.equal(isoDate('28-Sep-2026'), '2026-09-28');
  assert.equal(isoDate('nonsense'), null);
  assert.deepEqual(parseCsvLine('a,"b,c",d'), ['a', 'b,c', 'd']);
});
test('F11.1 layout: currencies found, USD first', () => {
  const cur = availableCurrencies(fx);
  assert.equal(cur[0], 'USD');
  assert.ok(cur.includes('TWI') && cur.includes('EUR') && cur.includes('JPY'));
  assert.equal(fx.rows.at(-1).date, '2026-09-28');
});
test('latest USD rate is the 28 Sep 2026 value in the file', () => {
  const { rows } = exchangeRows(fx, { currencies: ['usd'] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, '2026-09-28');
  assert.equal(rows[0].rate, 0.7023);
  assert.equal(rows[0].quote, 'USD');
  assert.equal(rows[0].unit, 'USD per A$1');
  assert.match(rows[0].attribution, /^Source: Reserve Bank of Australia 2026$/);
});
test('date range returns every day for each currency and skips blanks', () => {
  const { rows } = exchangeRows(fx, { currencies: ['USD', 'CHF'], latestOnly: false, dateFrom: '2026-09-24', dateTo: '2026-09-28' });
  const usd = rows.filter((r) => r.quote === 'USD');
  assert.deepEqual(usd.map((r) => r.date), ['2026-09-24', '2026-09-25', '2026-09-28']);
  assert.ok(rows.every((r) => Number.isFinite(r.rate)));
});
test('unknown currency is reported', () => {
  const { rows, unknown } = exchangeRows(fx, { currencies: ['USD', 'XYZ'] });
  assert.deepEqual(unknown, ['XYZ']);
  assert.equal(rows.length, 1);
});
test('maxItems caps output', () => {
  const { rows } = exchangeRows(fx, { latestOnly: false, maxItems: 5 });
  assert.equal(rows.length, 5);
});
test('cash rate: latest decision in the table', () => {
  const { rows } = cashRateRows(a2);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, '2026-05-06');
  assert.equal(rows[0].newCashRateTargetPercent, 4.35);
  assert.equal(rows[0].changePercentagePoints, '+0.25');
});
test('cash rate: range text rows keep their text', () => {
  const { rows } = cashRateRows(a2, { latestOnly: false, dateFrom: '1990-01-01', dateTo: '1990-03-01' });
  assert.equal(rows[0].newCashRateTargetPercent, null);
  assert.equal(rows[0].newCashRateTargetText, '17.00 to 17.50');
});
test('attribution year comes from publication date', () => {
  assert.equal(attribution(a2), 'Source: Reserve Bank of Australia 2026');
});
