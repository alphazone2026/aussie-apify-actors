// Pure check-digit logic. ABN: ABR "Validating an ABN" (weights 10,1,3,...,19 after taking 1 from the
// first digit, sum divisible by 89). ACN: ASIC Message Implementation Guide, Appendix D (weights 8..1 on
// digits 1-8, complement of the sum mod 10 is digit 9).

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
const ACN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 1];

export function digitsOnly(raw) {
  return String(raw ?? '').replace(/[\s.\-_]/g, '');
}

export function isValidAbn(d) {
  if (!/^\d{11}$/.test(d)) return false;
  const nums = d.split('').map(Number);
  nums[0] -= 1;
  const sum = nums.reduce((s, n, i) => s + n * ABN_WEIGHTS[i], 0);
  return sum % 89 === 0;
}

export function isValidAcn(d) {
  if (!/^\d{9}$/.test(d)) return false;
  const nums = d.split('').map(Number);
  const sum = ACN_WEIGHTS.reduce((s, w, i) => s + w * nums[i], 0);
  const check = (10 - (sum % 10)) % 10;
  return check === nums[8];
}

export const formatAbn = (d) => `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 11)}`;
export const formatAcn = (d) => `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;

/** @param {unknown} raw @param {'auto'|'abn'|'acn'} numberType */
export function check(raw, numberType = 'auto') {
  const input = String(raw ?? '');
  const d = digitsOnly(input);
  const base = { input, digits: d, type: null, valid: false, formatted: null, reason: null, possibleAcn: null };
  if (d === '') return { ...base, reason: 'empty' };
  if (!/^\d+$/.test(d)) return { ...base, reason: 'contains characters other than digits' };
  let type = numberType;
  if (numberType === 'auto') {
    if (d.length === 11) type = 'abn';
    else if (d.length === 9) type = 'acn';
    else return { ...base, reason: `expected 11 digits (ABN) or 9 digits (ACN), got ${d.length}` };
  }
  if (type === 'abn') {
    if (d.length !== 11) return { ...base, type: 'ABN', reason: `an ABN has 11 digits, got ${d.length}` };
    const valid = isValidAbn(d);
    const embedded = d.slice(2);
    return {
      ...base,
      type: 'ABN',
      valid,
      formatted: formatAbn(d),
      reason: valid ? null : 'check digit does not match',
      // The last 9 digits of a company's ABN are its ACN. Some sole trader ABNs pass this test by chance.
      possibleAcn: valid && isValidAcn(embedded) ? formatAcn(embedded) : null,
    };
  }
  if (d.length !== 9) return { ...base, type: 'ACN', reason: `an ACN has 9 digits, got ${d.length}` };
  const valid = isValidAcn(d);
  return { ...base, type: 'ACN', valid, formatted: formatAcn(d), reason: valid ? null : 'check digit does not match' };
}
