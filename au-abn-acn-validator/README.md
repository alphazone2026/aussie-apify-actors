# Australian ABN and ACN Validator (bulk)

Check thousands of Australian Business Numbers (ABN) and Australian Company Numbers (ACN) in seconds. Paste a list, get one clean row per number: valid or not, the tidy `12 345 678 901` format, and a plain reason when a number fails.

It works entirely offline. No login, no proxies, no calls to the ABR or ASIC, so it is fast and cheap.

## What it checks

- **ABN**: the 11 digit check the Australian Business Register publishes (take 1 from the first digit, apply the weights, the total must divide by 89).
- **ACN**: the 9 digit check ASIC publishes (weights 8 to 1, complement of the total modulo 10).
- Length, stray letters, spaces, dashes and dots. `51-824-753-556`, `51 824 753 556` and `51824753556` all work.
- For a valid ABN, it also tells you whether the last 9 digits form a valid ACN (a company ABN ends in its ACN). A few sole trader ABNs pass this test by chance, so treat it as a hint.

**A valid check digit does not prove the business exists.** It only proves the number is well formed. To confirm registration and the current status, look the number up on ABN Lookup (abr.business.gov.au).

## Use it to

- Clean a CRM, mailing or accounting import before it reaches your system.
- Catch typos in supplier, customer and invoice ABN fields.
- Add a cheap "is this number even valid" step to an AI agent or workflow.

## Input

| Field | What it is |
|---|---|
| `numbers` | List of ABNs and ACNs. Up to 10,000 per run. |
| `numberType` | `auto` (default: 11 digits is an ABN, 9 digits is an ACN), `abn` or `acn`. |

```json
{ "numbers": ["51 824 753 556", "004 085 616", "12 345 678 901"], "numberType": "auto" }
```

## Output

One row per input number:

```json
{
  "input": "88000014675",
  "type": "ABN",
  "valid": true,
  "formatted": "88 000 014 675",
  "reason": null,
  "possibleAcn": "000 014 675"
}
```

A row that fails looks like `{"input": "12 345 678 901", "type": "ABN", "valid": false, "formatted": "12 345 678 901", "reason": "check digit does not match", "possibleAcn": null}`.

A `SUMMARY` record in the key-value store gives the totals: how many checked, valid and not valid.

## Pricing

You pay per number checked (pay per event). Runs cost cents. See the pricing panel on this page for the current price.

## FAQ

**Does it use my ABR GUID?** No. It does not call the ABR at all.

**Does it check TFNs?** No, and it never should. Tax file numbers are sensitive personal information.

**Where do the algorithms come from?** The ABN rule is published by the Australian Business Register (abr.business.gov.au, "Validating an ABN"). The ACN rule is in ASIC's Message Implementation Guide for Software Developers, Appendix D.

Not affiliated with or endorsed by the Australian Taxation Office, the Australian Business Register or ASIC.
