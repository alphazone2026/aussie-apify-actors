# RBA Exchange Rates and Cash Rate to JSON

Australian dollar exchange rates and Reserve Bank of Australia cash rate decisions, as clean dated JSON rows. It reads the RBA's own published statistical tables, so the numbers match rba.gov.au.

Made for spreadsheets, dashboards, invoicing tools and AI agents that need "what was AUD/USD on this day" or "what is the cash rate" without parsing RBA CSV files.

## What you get

**Exchange rates (RBA table F11.1, daily, from 3 January 2023)**
- One row per date and currency: `date`, `base` (AUD), `quote`, `rate`, `unit`, `seriesId`, the data source RBA lists for that series and the RBA attribution line.
- Currencies the RBA publishes: USD, EUR, GBP, JPY, NZD, CNY, KRW, SGD, INR, THB, TWD, MYR, IDR, VND, AED, PGK, HKD, CAD, ZAR, CHF, PHP, SDR and the trade-weighted index (TWI).
- **Latest day only** (default) or a **date range** you choose.

**Cash rate target decisions (RBA table A2)**
- One row per decision: `date`, change in percentage points and the new cash rate target.
- Latest decision only, or a date range.

## Input

| Field | What it is |
|---|---|
| `dataset` | `exchange-rates` or `cash-rate-target` |
| `currencies` | For exchange rates: codes like `USD`, `EUR`. Blank means all. Add `TWI` for the trade-weighted index. |
| `latestOnly` | `true` returns the newest published day (or newest decision). |
| `dateFrom`, `dateTo` | `YYYY-MM-DD`. Used when `latestOnly` is off. Blank `dateFrom` means 30 days before the newest data (2 years for the cash rate). |
| `maxItems` | Safety limit on rows returned (default 1,000). |

```json
{ "dataset": "exchange-rates", "currencies": ["USD", "EUR", "NZD"], "latestOnly": true }
```

## Output example

```json
{
  "date": "2026-09-28",
  "base": "AUD",
  "quote": "USD",
  "rate": 0.7023,
  "seriesId": "FXRUSD",
  "dataSource": "WM/Reuters",
  "unit": "USD per A$1",
  "attribution": "Source: Reserve Bank of Australia 2026"
}
```

A `SUMMARY` record in the key-value store lists the newest data date, the row count and the attribution.

## Good to know

- Rates are **indicative**. Use the RBA's own notes for the exact time and method.
- The RBA table F11.1 starts on 3 January 2023. Older history sits in separate RBA tables that this Actor does not read.
- Some currencies are not updated every day (for example AED and CHF in the current table). "Latest day only" returns the newest value the RBA has for each currency, and the `date` field shows which day it is.
- The RBA can withdraw or amend data at any time.

## Data licence and disclosure

The RBA publishes this data free of charge at https://www.rba.gov.au/statistics/. This Actor only fetches the RBA's public CSV tables and reformats them. It is not endorsed by, or affiliated with, the Reserve Bank of Australia. Most RBA material is published under Creative Commons Attribution 4.0 International (see https://www.rba.gov.au/copyright/), with extra conditions for financial data. The attribution line "Source: Reserve Bank of Australia [year]" is included in every row. Do not use this data in a way that suggests the RBA endorses you. Some series carry a different data provider in the `dataSource` field (for example WM/Reuters for the USD rate): check that provider's terms if you republish.

## Pricing

You pay per row returned (pay per event). See the pricing panel on this page.
