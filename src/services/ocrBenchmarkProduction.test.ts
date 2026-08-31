import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('ocrBenchmark production routing', () => {
  it('uses only the production srv-fullchatbot endpoint (no local bridge)', () => {
    const src = readFileSync(new URL('./ocrBenchmarkService.ts', import.meta.url), 'utf8');
    assert.ok(src.includes('/debug/ocr-benchmark'));
    assert.ok(!src.includes('4020'));
    assert.ok(!src.includes('127.0.0.1'));
    assert.ok(!src.includes('__local-ocr-bridge'));
    assert.ok(!src.includes('VITE_LOCAL_OCR_BRIDGE'));
    assert.ok(!src.includes('ocrBenchmarkHybrid'));
  });
});
