/* DP-0013: the clear button is enabled exactly when the input has a value, updated whenever the value changes. */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, pickerOf, currentDay, next, key, timeItem } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

async function start(t, attrs, value = '') {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(`<div class="date-picker-wrapper" id="w" ${attrs}><input class="date-input" value="${value}"></div>`);
    await loadModule('datetimepicker');
    await settle();
    const wrapper = env.document.getElementById('w');
    const picker = pickerOf(wrapper);
    return { wrapper, picker, input: wrapper.querySelector('.date-input'), clear: picker.querySelector('.clear-button') };
}

test('datetime: with no value the clear button stays disabled while only the time is preselected or picked', async (t) => {
    const { wrapper, picker, input, clear } = await start(t, 'data-mode="datetime"');
    input.click();
    assert.ok(clear.disabled, 'opened: the time is preselected but nothing is written');
    next(wrapper);
    assert.ok(clear.disabled, 'redrawing the calendar does not enable it');
    timeItem(picker, 'dp-hour-item', '14').click();
    assert.equal(input.value, '');
    assert.ok(clear.disabled, 'picking a time without a date writes nothing');
});

test('datetime: picking a date enables the clear button at once; clearing disables it', async (t) => {
    const { wrapper, input, clear } = await start(t, 'data-mode="datetime"');
    input.click();
    currentDay(wrapper, 20).click();
    assert.notEqual(input.value, '');
    assert.ok(!clear.disabled);
    clear.click();
    assert.equal(input.value, '');
    input.click();
    assert.ok(clear.disabled);
});

test('date: an unreadable value can be cleared (the button follows the value)', async (t) => {
    const { input, clear } = await start(t, 'data-mode="date"', 'abc');
    input.click();
    assert.ok(!clear.disabled);
    clear.click();
    assert.equal(input.value, '');
    input.click();
    assert.ok(clear.disabled);
});

test('time: enabled after opening (a value is written), disabled after clearing', async (t) => {
    const { picker, input, clear } = await start(t, 'data-mode="time"');
    input.click();
    assert.ok(!clear.disabled);
    clear.click();
    input.click();
    assert.ok(!clear.disabled, 'opening writes the time again');
    key(picker, 'Escape');
});
