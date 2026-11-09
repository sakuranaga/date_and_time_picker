/* DP-0006: in datetime mode the format applies to the date part; the time ( HH:mm) is appended.
   The time of an existing value is read only from "<date in the format> HH:mm". */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, wrapperHtml, pickerOf, currentDay, key, timeItem, selectedValue } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

async function start(t, attrs) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(wrapperHtml(attrs, 0) + '<div id="manual"><input class="date-input"></div>');
    const mod = await loadModule('datetimepicker');
    await settle();
    const wrapper = env.document.querySelector('.date-picker-wrapper');
    return { mod, wrapper, input: wrapper.querySelector('.date-input'), picker: pickerOf(wrapper) };
}

const hour = (picker) => selectedValue(picker, 'dp-hour-item');
const minute = (picker) => selectedValue(picker, 'dp-minute-item');

test('datetime + data-format="YYYY-MM-DD": the date part follows the format and the time is appended', async (t) => {
    const { wrapper, input, picker } = await start(t, 'data-mode="datetime" data-format="YYYY-MM-DD"');
    input.click();
    currentDay(wrapper, 20).click();
    assert.equal(input.value, '2026-01-20 10:00');
    timeItem(picker, 'dp-hour-item', '14').click();
    assert.equal(input.value, '2026-01-20 14:00');

    // reopening reads the time back from the formatted value
    key(picker, 'Escape');
    input.click();
    assert.equal(hour(picker), '14');
    assert.equal(minute(picker), '00');
    assert.equal(input.value, '2026-01-20 14:00');
});

test('datetime + data-format="DD.MM.YYYY"', async (t) => {
    const { wrapper, input } = await start(t, 'data-mode="datetime" data-format="DD.MM.YYYY"');
    input.click();
    currentDay(wrapper, 20).click();
    assert.equal(input.value, '20.01.2026 10:00');
});

test('datetime with the format option given in JavaScript', async (t) => {
    const { mod } = await start(t, '');
    const manual = env.document.getElementById('manual');
    new mod.DateTimePicker(manual, { mode: 'datetime', format: 'YYYY-MM-DD' });
    manual.querySelector('.date-input').click();
    currentDay(manual, 20).click();
    assert.equal(manual.querySelector('.date-input').value, '2026-01-20 10:00');
});

for (const [format, dateOnly, withTime] of [
    ['YYYY/MM:DD', '2026/01:30', '2026/01:30 14:00'],
    ['YYYY MM:DD', '2026 01:30', '2026 01:30 14:00'],
]) {
    test(`datetime + data-format="${format}": a date-only value is not read as a time`, async (t) => {
        const { input, picker } = await start(t, `data-mode="datetime" data-format="${format}"`);
        input.value = dateOnly;
        input.click();
        // not 01:30 from the date: no time in the value, so the current time is preselected
        assert.equal(hour(picker), '10');
        assert.equal(minute(picker), '00');
        assert.equal(input.value, dateOnly, 'no date is picked yet, so nothing is written');
        key(picker, 'Escape');

        input.value = withTime;
        input.click();
        assert.equal(hour(picker), '14');
        assert.equal(minute(picker), '00');
    });
}

/* unchanged */

test('datetime without data-format keeps YYYY/MM/DD HH:mm', async (t) => {
    const { wrapper, input } = await start(t, 'data-mode="datetime"');
    input.click();
    currentDay(wrapper, 20).click();
    assert.equal(input.value, '2026/01/20 10:00');
});

test('time mode ignores data-format', async (t) => {
    const { input } = await start(t, 'data-mode="time" data-format="YYYY-MM-DD"');
    input.click();
    assert.equal(input.value, '10:00');
});

test('date mode applies data-format as before', async (t) => {
    const { wrapper, input } = await start(t, 'data-mode="date" data-format="YYYY-MM-DD"');
    input.click();
    currentDay(wrapper, 20).click();
    assert.equal(input.value, '2026-01-20');
});
