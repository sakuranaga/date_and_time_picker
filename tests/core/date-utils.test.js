import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    parseDateOption, startOfDay, isOutOfRange, isSameDay, holidayKey, formatDate, buildMonthCells,
    addDays, addMonthsClamped, keyTargetDate, datePattern,
} from '../../core/date-utils.js';

const ymd = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

test('parseDateOption: empty values give null', () => {
    assert.equal(parseDateOption(null), null);
    assert.equal(parseDateOption(undefined), null);
    assert.equal(parseDateOption(''), null);
});

test("parseDateOption: 'today' is the start of the given day", () => {
    const d = parseDateOption('today', new Date(2026, 0, 15, 10, 30));
    assert.deepEqual(ymd(d), [2026, 1, 15]);
    assert.equal(d.getHours() + d.getMinutes() + d.getSeconds() + d.getMilliseconds(), 0);
});

test('parseDateOption: a Date is returned as is', () => {
    const date = new Date(2026, 4, 1, 12);
    assert.equal(parseDateOption(date), date);
});

test('parseDateOption: YYYY-M-D is read as local time (with or without zero padding)', () => {
    assert.deepEqual(ymd(parseDateOption('2026-01-05')), [2026, 1, 5]);
    assert.deepEqual(ymd(parseDateOption('2026-1-5')), [2026, 1, 5]);
    assert.equal(parseDateOption('2026-1-5').getHours(), 0);
});

test('parseDateOption: other strings go through Date, invalid ones give null', () => {
    assert.deepEqual(ymd(parseDateOption('2026/03/04')), [2026, 3, 4]);
    assert.equal(parseDateOption('not a date'), null);
});

test('startOfDay returns a new Date at 00:00:00.000', () => {
    const src = new Date(2026, 0, 15, 23, 59, 59, 999);
    const d = startOfDay(src);
    assert.notEqual(d, src);
    assert.deepEqual(ymd(d), [2026, 1, 15]);
    assert.equal(d.getHours() + d.getMinutes() + d.getSeconds() + d.getMilliseconds(), 0);
    assert.equal(src.getHours(), 23, 'the argument is not modified');
});

test('isOutOfRange: compares by day and includes both ends', () => {
    const min = new Date(2026, 0, 10, 18);
    const max = new Date(2026, 0, 20, 6);
    assert.equal(isOutOfRange(new Date(2026, 0, 9, 23, 59), min, max), true);
    assert.equal(isOutOfRange(new Date(2026, 0, 10, 0, 0), min, max), false);
    assert.equal(isOutOfRange(new Date(2026, 0, 20, 23, 59), min, max), false);
    assert.equal(isOutOfRange(new Date(2026, 0, 21), min, max), true);
});

test('isOutOfRange: a missing bound is not checked', () => {
    assert.equal(isOutOfRange(new Date(1900, 0, 1), null, null), false);
    assert.equal(isOutOfRange(new Date(1900, 0, 1), null, new Date(2026, 0, 1)), false);
    assert.equal(isOutOfRange(new Date(2100, 0, 1), new Date(2026, 0, 1), null), false);
});

test('isSameDay ignores the time of day', () => {
    assert.equal(isSameDay(new Date(2026, 0, 15, 0), new Date(2026, 0, 15, 23)), true);
    assert.equal(isSameDay(new Date(2026, 0, 15), new Date(2026, 0, 16)), false);
    assert.equal(isSameDay(new Date(2026, 0, 15), new Date(2025, 0, 15)), false);
});

test('holidayKey is YYYY/M/D without zero padding', () => {
    assert.equal(holidayKey(new Date(2026, 0, 1)), '2026/1/1');
    assert.equal(holidayKey(new Date(2026, 10, 23)), '2026/11/23');
});

test('formatDate replaces YYYY, MM and DD', () => {
    const d = new Date(2026, 0, 5);
    assert.equal(formatDate(d, 'YYYY/MM/DD'), '2026/01/05');
    assert.equal(formatDate(d, 'YYYY-MM-DD'), '2026-01-05');
    assert.equal(formatDate(d, 'DD.MM.YYYY'), '05.01.2026');
});

test('buildMonthCells: 42 cells, leading and trailing days marked as other month', () => {
    // January 2026 starts on Thursday: Dec 28-31, Jan 1-31, Feb 1-7
    const cells = buildMonthCells(2026, 0);
    assert.equal(cells.length, 42);
    assert.deepEqual(ymd(cells[0].date), [2025, 12, 28]);
    assert.equal(cells[0].otherMonth, true);
    assert.deepEqual(ymd(cells[4].date), [2026, 1, 1]);
    assert.equal(cells[4].otherMonth, false);
    assert.deepEqual(ymd(cells[34].date), [2026, 1, 31]);
    assert.deepEqual(ymd(cells[41].date), [2026, 2, 7]);
    assert.equal(cells[41].otherMonth, true);
    assert.equal(cells.filter((c) => !c.otherMonth).length, 31);
});

test('buildMonthCells: a month starting on Sunday has no leading days', () => {
    const cells = buildMonthCells(2026, 1); // February 2026 starts on Sunday
    assert.deepEqual(ymd(cells[0].date), [2026, 2, 1]);
    assert.equal(cells[0].otherMonth, false);
    assert.equal(cells.filter((c) => !c.otherMonth).length, 28);
});

test('buildMonthCells: leap year February and the December/January boundary', () => {
    assert.equal(buildMonthCells(2028, 1).filter((c) => !c.otherMonth).length, 29);
    const dec = buildMonthCells(2025, 11);
    assert.deepEqual(ymd(dec.find((c) => !c.otherMonth).date), [2025, 12, 1]);
    assert.deepEqual(ymd(dec[41].date), [2026, 1, 10]);
});

test('addDays crosses months and years and keeps the time of day', () => {
    assert.deepEqual(ymd(addDays(new Date(2026, 0, 31), 1)), [2026, 2, 1]);
    assert.deepEqual(ymd(addDays(new Date(2026, 0, 1), -1)), [2025, 12, 31]);
    assert.deepEqual(ymd(addDays(new Date(2028, 1, 28), 1)), [2028, 2, 29]);
    assert.equal(addDays(new Date(2026, 0, 15, 10, 30), 7).getHours(), 10);
});

test('addMonthsClamped keeps the day of the month, clamped to the target month', () => {
    assert.deepEqual(ymd(addMonthsClamped(new Date(2026, 0, 31), 1)), [2026, 2, 28]);
    assert.deepEqual(ymd(addMonthsClamped(new Date(2028, 0, 31), 1)), [2028, 2, 29]);
    assert.deepEqual(ymd(addMonthsClamped(new Date(2026, 2, 31), -1)), [2026, 2, 28]);
    assert.deepEqual(ymd(addMonthsClamped(new Date(2026, 0, 15), -1)), [2025, 12, 15]);
    assert.deepEqual(ymd(addMonthsClamped(new Date(2025, 11, 31), 1)), [2026, 1, 31]);
});

test('keyTargetDate maps the navigation keys and returns null for others', () => {
    const d = new Date(2026, 0, 15);
    assert.deepEqual(ymd(keyTargetDate(d, 'ArrowRight')), [2026, 1, 16]);
    assert.deepEqual(ymd(keyTargetDate(d, 'ArrowLeft')), [2026, 1, 14]);
    assert.deepEqual(ymd(keyTargetDate(d, 'ArrowDown')), [2026, 1, 22]);
    assert.deepEqual(ymd(keyTargetDate(d, 'ArrowUp')), [2026, 1, 8]);
    assert.deepEqual(ymd(keyTargetDate(d, 'PageDown')), [2026, 2, 15]);
    assert.deepEqual(ymd(keyTargetDate(d, 'PageUp')), [2025, 12, 15]);
    assert.equal(keyTargetDate(d, 'Home'), null);
    assert.equal(keyTargetDate(d, 'a'), null);
});

test('datePattern turns the first YYYY / MM / DD into groups and escapes everything else', () => {
    assert.equal(datePattern('YYYY/MM/DD'), '(\\d+)/(\\d{2})/(\\d{2})');
    assert.equal(datePattern('DD.MM.YYYY'), '(\\d{2})\\.(\\d{2})\\.(\\d+)');
    assert.ok(new RegExp(`^${datePattern('YYYY (MM)+DD?')}$`).test('2026 (01)+20?'));
    // only the first of each token is replaced, like formatDate
    assert.ok(new RegExp(`^${datePattern('YYYY-MM-DD MM')}$`).test('2026-01-20 MM'));
    for (const format of ['YYYY/MM/DD', 'YYYY-MM-DD', 'DD.MM.YYYY', 'YYYY年MM月DD日', 'YYYY MM:DD']) {
        assert.ok(new RegExp(`^${datePattern(format)}$`).test(formatDate(new Date(2026, 0, 5), format)), format);
    }
});
