import { Actor, log } from 'apify';
import { check } from './validate.js';

const MAX_NUMBERS = 10000;

await Actor.init();
try {
  const input = (await Actor.getInput()) ?? {};
  const numbers = Array.isArray(input.numbers) ? input.numbers : [];
  const numberType = ['auto', 'abn', 'acn'].includes(input.numberType) ? input.numberType : 'auto';
  if (numbers.length === 0) {
    await Actor.fail('No numbers given. Add at least one ABN or ACN to the "numbers" input.');
  } else {
    const batch = numbers.slice(0, MAX_NUMBERS);
    if (numbers.length > MAX_NUMBERS) log.warning(`Only the first ${MAX_NUMBERS} of ${numbers.length} numbers are checked in one run.`);
    const results = batch.map((n) => {
      const { digits, ...row } = check(n, numberType);
      return row;
    });
    const ok = results.filter((r) => r.valid).length;
    // Apify charges its built-in per-result event for each item saved here (price set in Console > Monetization).
    await Actor.pushData(results);
    await Actor.setValue('SUMMARY', { checked: results.length, valid: ok, invalid: results.length - ok, note: 'Check digit only. A valid check digit does not prove the number is registered.' });
    await Actor.setStatusMessage(`Checked ${results.length}: ${ok} valid, ${results.length - ok} not valid`);
  }
} finally {
  await Actor.exit();
}
