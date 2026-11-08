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

// Only cases without an hour carry: rounding up past :59 is DP-0002
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
