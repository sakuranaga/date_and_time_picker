import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOURS, minuteValues, nearestTime, matchTimeValue, splitTimeValue } from '../../core/time-utils.js';

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

test('matchTimeValue (datetime mode) needs HH:mm at the end', () => {
    assert.deepEqual(matchTimeValue('2026/01/20 14:30', 'datetime'), { hour: '14', minute: '30' });
    assert.equal(matchTimeValue('2026/01/20', 'datetime'), null);
    assert.deepEqual(matchTimeValue('08:30:00', 'datetime'), { hour: '30', minute: '00' });
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

test('nearestTime with a step that does not divide 60 stays on the step grid and carries only past :59', () => {
    // 59 / 9 rounds to 7, 7 * 9 = 63 >= 60: carries
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 59), 9), { hour: '11', minute: '00' });
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 23, 59), 9), { hour: '00', minute: '00' });
    // 59 / 7 rounds to 8, 8 * 7 = 56: no carry
    assert.deepEqual(nearestTime(new Date(2026, 0, 15, 10, 59), 7), { hour: '10', minute: '56' });
});
