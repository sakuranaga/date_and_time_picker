import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOURS, minuteValues, nearestTime, matchTimeValue, matchDateTimeTime, splitTimeValue } from '../../core/time-utils.js';
import { formatDate } from '../../core/date-utils.js';

test('HOURS is 00..23', () => {
    assert.equal(HOURS.length, 24);
    assert.equal(HOURS[0], '00');
    assert.equal(HOURS[9], '09');
    assert.equal(HOURS[23], '23');
});

test('minuteValues lists the minutes of a step below 60', () => {
    assert.deepEqual(minuteValues(30), ['00', '30']);
    assert.deepEqual(minuteValues(15), ['00', '15', '30', '45']);
    assert.equal(minuteValues(1).length, 60);
    assert.equal(minuteValues(5)[11], '55');
});

test('nearestTime rounds the minute to the step (no hour carry)', () => {
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 0), 30), { hour: '10', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 10), 30), { hour: '10', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 20), 30), { hour: '10', minute: '30' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 9, 7), 15), { hour: '09', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 9, 8), 15), { hour: '09', minute: '15' });
});

test('matchTimeValue (time mode) finds HH:mm anywhere', () => {
    assert.deepEqual(matchTimeValue('08:30', 'time'), { hour: '08', minute: '30' });
    assert.deepEqual(matchTimeValue('08:30:00', 'time'), { hour: '08', minute: '30' });
    assert.equal(matchTimeValue('8:5', 'time'), null);
    assert.equal(matchTimeValue('abc', 'time'), null);
});

// DP-0006: the datetime time is read only from "<date in the format> HH:mm" (it used to be any trailing HH:mm,
// so '08:30:00' gave 30:00 and a date ending in "01:30" was read as a time)
test('matchDateTimeTime reads the time only after a date in the format', () => {
    assert.deepEqual(matchDateTimeTime('2026/01/20 14:30', 'YYYY/MM/DD'), { hour: '14', minute: '30' });
    assert.deepEqual(matchDateTimeTime('2026-01-20 14:30', 'YYYY-MM-DD'), { hour: '14', minute: '30' });
    assert.deepEqual(matchDateTimeTime('20.01.2026 09:05', 'DD.MM.YYYY'), { hour: '09', minute: '05' });
    assert.deepEqual(matchDateTimeTime('2026 01:30 14:00', 'YYYY MM:DD'), { hour: '14', minute: '00' });
    assert.equal(matchDateTimeTime('2026/01/20', 'YYYY/MM/DD'), null);
    assert.equal(matchDateTimeTime('2026/01:30', 'YYYY/MM:DD'), null);
    assert.equal(matchDateTimeTime('2026 01:30', 'YYYY MM:DD'), null);
    assert.equal(matchDateTimeTime('2026-01-20 14:30', 'YYYY/MM/DD'), null);
    assert.equal(matchDateTimeTime('2026/01/07 08:30:00', 'YYYY/MM/DD'), null);
    assert.equal(matchDateTimeTime('', 'YYYY/MM/DD'), null);
});

test('matchDateTimeTime reads back what formatDate wrote, including years below 1000 and above 9999', () => {
    for (const year of [999, 2026, 10000]) {
        const value = `${formatDate(new Date(year, 0, 20), 'YYYY/MM/DD')} 14:30`;
        assert.deepEqual(matchDateTimeTime(value, 'YYYY/MM/DD'), { hour: '14', minute: '30' }, value);
    }
});

test('splitTimeValue splits on the colon as TimePicker does', () => {
    assert.deepEqual(splitTimeValue('08:30'), ['08', '30']);
    assert.deepEqual(splitTimeValue('8:5'), ['8', '5']);
    assert.deepEqual(splitTimeValue('08:30:00'), ['08', '30', '00']);
    assert.deepEqual(splitTimeValue('abc'), ['abc']);
});

// DP-0002: rounding up past :59 carries into the hour (and past 23:59 into 00)
test('nearestTime carries into the next hour when the minute rounds up to 60', () => {
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 50), 30), { hour: '11', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 45), 30), { hour: '11', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 53), 15), { hour: '11', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 52), 15), { hour: '10', minute: '45' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 9, 59), 5), { hour: '10', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 9, 59), 1), { hour: '09', minute: '59' });
});

test('nearestTime wraps 23:xx rounding up to 00:00', () => {
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 23, 50), 30), { hour: '00', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 23, 44), 30), { hour: '23', minute: '30' });
});

test('nearestTime always gives a minute that is one of minuteValues(step)', () => {
    for (const step of [1, 5, 7, 9, 10, 15, 17, 20, 30]) {
        const values = minuteValues(step);
        for (let m = 0; m < 60; m++) {
            const { minute } = nearestTime(new Date(2026, 0, 15, 10, m), step);
            assert.ok(values.includes(minute), `step ${step}, minute ${m} -> ${minute}`);
        }
    }
});

// Since DP-0005 a step that does not divide 60 is replaced by 30 (it used to round on its own grid)
test('nearestTime with a step that does not divide 60 rounds with the default 30', () => {
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 59), 9), { hour: '11', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 23, 59), 9), { hour: '00', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 59), 7), { hour: '11', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 44), 7), { hour: '10', minute: '30' });
});
