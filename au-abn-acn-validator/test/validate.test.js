import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, isValidAbn, isValidAcn } from '../src/validate.js';

test('ABN: published example from the ABR is valid', () => {
  assert.equal(isValidAbn('51824753556'), true);
});
test('ABN: Woolworths Group 88 000 014 675', () => {
  const r = check('88 000 014 675');
  assert.equal(r.valid, true);
  assert.equal(r.type, 'ABN');
  assert.equal(r.formatted, '88 000 014 675');
  assert.equal(r.possibleAcn, '000 014 675');
});
test('ABN: one digit wrong fails', () => {
  assert.equal(isValidAbn('51824753557'), false);
  assert.equal(check('51 824 753 557').reason, 'check digit does not match');
});
test('ACN: ASIC worked example 004 085 616', () => {
  assert.equal(isValidAcn('004085616'), true);
  assert.equal(check('004 085 616').valid, true);
  assert.equal(check('004 085 617').valid, false);
});
test('ACN: complement of 10 becomes 0', () => {
  // digits 00000010 -> sum 1*... find a number whose remainder is 0: 000000000 sums to 0, check digit 0
  assert.equal(isValidAcn('000000000'), true);
});
test('formatting characters are ignored', () => {
  assert.equal(check('51-824-753-556').valid, true);
  assert.equal(check('  51.824.753.556 ').valid, true);
});
test('bad lengths and junk', () => {
  assert.match(check('12345').reason, /expected 11 digits/);
  assert.equal(check('').reason, 'empty');
  assert.match(check('ABN 5182475355x').reason, /contains characters/);
  assert.match(check('004085616', 'abn').reason, /11 digits/);
  assert.match(check('51824753556', 'acn').reason, /9 digits/);
});
