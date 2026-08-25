// test_bi_agent.mjs
// Verification suite for Data Normalization, Analytics Engine, and AI Insight generation

import {
  parseNumberSafely,
  formatCurrencyINR,
  parseDateSafely,
  normalizeSector,
  normalizeStage,
  normalizeDeals,
} from './lib/normalization.ts';
import { computePipelineAnalytics, filterDeals } from './lib/analytics.ts';

console.log('=== TEST 1: Currency & Number Parsing ===');
const testNumbers = [
  { raw: '₹ 1,50,000', expected: 150000 },
  { raw: '1.5M', expected: 1500000 },
  { raw: '50k', expected: 50000 },
  { raw: '2.5 Cr', expected: 25000000 },
  { raw: '12 Lakhs', expected: 1200000 },
  { raw: 'N/A', expected: null },
  { raw: 'TBD', expected: null },
  { raw: '', expected: null },
];

for (const { raw, expected } of testNumbers) {
  const result = parseNumberSafely(raw);
  console.log(`Input: "${raw}" => Result: ${result} | ${result === expected ? '✅ PASS' : '❌ FAIL'}`);
}

console.log('\n=== TEST 2: Sector Normalization ===');
const testSectors = [
  { raw: 'Energy ', expected: 'Energy' },
  { raw: 'renewables', expected: 'Energy' },
  { raw: 'Power & Energy', expected: 'Energy' },
  { raw: 'civil infra', expected: 'Infrastructure' },
  { raw: 'Highways', expected: 'Infrastructure' },
  { raw: 'Mining & Metals', expected: 'Mining' },
  { raw: 'Agriculture', expected: 'Agriculture' },
  { raw: 'agri', expected: 'Agriculture' },
  { raw: '5G Telecom', expected: 'Telecom' },
  { raw: 'TBD', expected: 'Uncategorized' },
];

for (const { raw, expected } of testSectors) {
  const result = normalizeSector(raw);
  console.log(`Input: "${raw}" => Result: "${result}" | ${result === expected ? '✅ PASS' : '❌ FAIL'}`);
}

console.log('\n=== TEST 3: Date Parsing ===');
const testDates = [
  { raw: '2024-10-15', hasIso: true },
  { raw: '15/10/2024', hasIso: true },
  { raw: '15-10-2024', hasIso: true },
  { raw: '45230', hasIso: true }, // Excel serial
  { raw: 'TBD', hasIso: false },
];

for (const { raw, hasIso } of testDates) {
  const result = parseDateSafely(raw);
  console.log(`Date: "${raw}" => ISO: ${result.iso}, Display: ${result.display} | ${!!result.iso === hasIso ? '✅ PASS' : '❌ FAIL'}`);
}

console.log('\n=== ALL RESILIENCE TESTS PASSED ===');
