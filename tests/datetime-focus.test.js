/* DP-0004: in datetime mode, picking a date keeps the focus inside the picker (on the picked day),
   so Escape, Tab (focus trap) and the arrow keys keep working. */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, wrapperHtml, pickerOf, isOpen, currentDay, display, key } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

async function open(t) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(wrapperHtml('data-mode="datetime"', 0));
    await loadModule('datetimepicker');
    await settle();
    const wrapper = env.document.querySelector('.date-picker-wrapper');
    const input = wrapper.querySelector('.date-input');
    input.click();
    return { wrapper, input, picker: pickerOf(wrapper) };
}

const active = () => env.document.activeElement;

test('DateTimePicker (datetime): after clicking a date the picked day has the focus', async (t) => {
    const { wrapper } = await open(t);
    currentDay(wrapper, 20).click();
    assert.equal(active(), currentDay(wrapper, 20));
    assert.ok(active().classList.contains('selected'));
});

test('DateTimePicker (datetime): Escape closes the picker after a date was picked', async (t) => {
    const { wrapper, input } = await open(t);
    currentDay(wrapper, 20).click();
    key(active(), 'Escape');
    assert.ok(!isOpen(wrapper));
    assert.equal(active(), input);
});

test('DateTimePicker (datetime): picking with Enter keeps the keyboard in the calendar', async (t) => {
    const { wrapper } = await open(t);
    key(active(), 'ArrowRight'); // 16
    key(active(), 'Enter');
    assert.equal(wrapper.querySelector('.date-input').value, '2026/01/16 10:00');
    assert.equal(active(), currentDay(wrapper, 16));
    key(active(), 'ArrowRight');
    assert.equal(active(), currentDay(wrapper, 17));
});

test('DateTimePicker (datetime): picking a day of another month shows that month and focuses the day', async (t) => {
    const { wrapper, picker } = await open(t);
    const feb1 = [...picker.querySelectorAll('.calendar-day.other-month')].find((b) => b.textContent === '1');
    feb1.click();
    assert.equal(display(wrapper), '2026年2月');
    assert.equal(active(), currentDay(wrapper, 1));
});

test('DateTimePicker (datetime): Tab stays inside the picker after a date was picked (focus trap)', async (t) => {
    const { wrapper, picker } = await open(t);
    currentDay(wrapper, 20).click();
    const focusable = [...picker.querySelectorAll('button:not([disabled]):not([tabindex="-1"])')];
    const last = focusable[focusable.length - 1];
    last.focus();
    const event = key(last, 'Tab');
    assert.ok(event.defaultPrevented, 'the trap handles Tab on the last button');
    assert.equal(active(), focusable[0]);
});
