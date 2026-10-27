import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../csv.ts';
import { parseTime, activeServices } from '../gtfs.ts';

test('CSV preserves quoted commas, escaped quotes, embedded newlines and physical source lines', () => {
  const result = parseCsv('\uFEFFid,name\r\nA,"A, \"\"Central\"\""\r\nB,"two\nlines"\r\nC,last\r\n');
  assert.deepEqual(result.columns, ['id', 'name']);
  assert.deepEqual(result.rows, [
    { row: 2, values: { id: 'A', name: 'A, "Central"' } },
    { row: 3, values: { id: 'B', name: 'two\nlines' } },
    { row: 5, values: { id: 'C', name: 'last' } },
  ]);
});
test('CSV rejects malformed rows, invalid quoting and duplicate headers; accepts header-only files', () => {
  for (const text of ['a,b\n1', 'a,a\n1,2', 'a\n"open', 'a\nab"cd', 'a\n"ok"oops']) {
    assert.throws(() => parseCsv(text));
  }
  assert.deepEqual(parseCsv('a,b\r\n').rows, []);
});
test('GTFS times preserve next-day seconds and reject malformed or out-of-range values', () => {
  assert.equal(parseTime('5:06:22'), 18382);
  assert.equal(parseTime('25:04:52'), 90292);
  for (const value of ['', '-1:00:00', '12:60:00', '12:00:60', '12:00', '12:0:00']) assert.throws(() => parseTime(value));
});
test('calendar selects the actual weekday, enforces validity and applies add/remove exceptions', () => {
  const calendar = parseCsv('service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nWD,1,1,1,1,1,0,0,20260101,20261231\nSAT,0,0,0,0,0,1,0,20260101,20261231\nSUN,0,0,0,0,0,0,1,20260101,20261231').rows;
  assert.deepEqual([...activeServices(calendar, [], '2026-10-27')], ['WD']);
  assert.deepEqual([...activeServices(calendar, [], '2026-10-31')], ['SAT']);
  assert.deepEqual([...activeServices(calendar, [], '2026-11-01')], ['SUN']);
  assert.equal(activeServices(calendar, [], '2025-10-27').size, 0);
  const exceptions = parseCsv('service_id,date,exception_type\nWD,20261027,2\nSUN,20261027,1').rows;
  assert.deepEqual([...activeServices(calendar, exceptions, '2026-10-27')], ['SUN']);
  assert.throws(() => activeServices(calendar, [], '2026-02-30'));
  assert.throws(() => activeServices(calendar, [], '27-10-2026'));
});
