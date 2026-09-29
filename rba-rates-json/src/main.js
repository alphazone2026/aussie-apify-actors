import { Actor, log } from 'apify';
import { SOURCES, attribution, availableCurrencies, cashRateRows, exchangeRows, parseTable } from './rba.js';

const UA = 'rba-rates-json Apify Actor (reads RBA published CSV tables)';
const DISCLOSURE =
  'The Reserve Bank of Australia publishes this data free of charge at https://www.rba.gov.au/statistics/. This Actor only reformats it and is not endorsed by, or affiliated with, the RBA. Exchange rates are indicative. The RBA may withdraw or amend data.';

async function fetchText(url) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/csv,*/*' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      log.warning(`Fetch attempt ${attempt} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error(`Could not download ${url}: ${lastErr?.message}`);
}

const okDate = (s) => (s === undefined || s === null || s === '' ? undefined : /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim()) ? String(s).trim() : null);

await Actor.init();
try {
  const input = (await Actor.getInput()) ?? {};
  const dataset = input.dataset === 'cash-rate-target' ? 'cash-rate-target' : 'exchange-rates';
  const latestOnly = input.latestOnly !== false;
  const dateFrom = okDate(input.dateFrom);
  const dateTo = okDate(input.dateTo);
  if (dateFrom === null || dateTo === null) {
    await Actor.fail('Dates must be written as YYYY-MM-DD, for example 2026-01-31.');
  } else {
    const maxItems = Math.min(Math.max(parseInt(input.maxItems, 10) || 1000, 1), 20000);
    const src = SOURCES[dataset];
    const table = parseTable(await fetchText(src.url));
    const opts = { currencies: input.currencies ?? [], latestOnly, dateFrom, dateTo, maxItems };
    const { rows, unknown } = dataset === 'exchange-rates' ? exchangeRows(table, opts) : cashRateRows(table, opts);
    if (unknown.length) log.warning(`Currencies not published by the RBA in table ${src.table}: ${unknown.join(', ')}. Available: ${availableCurrencies(table).join(', ')}`);
    if (rows.length === 0) {
      await Actor.setStatusMessage('No rows matched your input.');
      log.warning('No rows matched. Check the currency codes and the date range.');
    } else {
      // One 'result' event per row (price is set in the Apify Console under Monetization).
      await Actor.pushData(rows, 'result');
    }
    await Actor.setValue('SUMMARY', {
      dataset,
      rbaTable: src.table,
      rows: rows.length,
      unknownCurrencies: unknown,
      newestDataDate: table.rows.length ? table.rows[table.rows.length - 1].date : null,
      attribution: attribution(table),
      rbaPublishesThisFreeAt: src.page,
      disclosure: DISCLOSURE,
    });
    await Actor.setStatusMessage(`${rows.length} rows from RBA table ${src.table}`);
  }
} finally {
  await Actor.exit();
}
