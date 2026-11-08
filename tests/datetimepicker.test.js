import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { runDateSuite } from './helpers/date-suite.js';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import {
    NOW, wrapperHtml, pickerOf, isOpen, currentDay, key, timeItem, selectedValue,
} from './helpers/picker.js';

// date mode: the same characterization as DatePicker, with and without an explicit data-mode
runDateSuite('datetimepicker', 'DateTimePicker');
runDateSuite('datetimepicker', 'DateTimePicker', 'data-mode="date"');

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

async function start(t, wrappers) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(wrappers.map((attrs, i) => wrapperHtml(attrs, i)).join('')
        + '<button type="button" id="outside">outside</button>');
    const { DateTimePicker } = await loadModule('datetimepicker');
    await settle();
    return { DateTimePicker, document: env.document, wrappers: [...env.document.querySelectorAll('.date-picker-wrapper')] };
}

test('DateTimePicker: each mode builds its own DOM', async (t) => {
    const { wrappers } = await start(t, ['data-mode="date"', 'data-mode="time" data-minute-step="15"', 'data-mode="datetime"']);
    const [date, time, datetime] = wrappers.map(pickerOf);

    assert.ok(date.querySelector('.calendar-grid'));
    assert.equal(date.querySelector('.dp-hour-column'), null);

    assert.ok(time.classList.contains('dp-time-only'));
    assert.equal(time.querySelector('.calendar-grid'), null);
    assert.equal(time.querySelectorAll('.dp-hour-item').length, 24);
    assert.deepEqual([...time.querySelectorAll('.dp-minute-item')].map((i) => i.dataset.value), ['00', '15', '30', '45']);

    assert.ok(datetime.classList.contains('dp-datetime'));
    assert.ok(datetime.querySelector('.calendar-grid'));
    assert.equal(datetime.querySelectorAll('.dp-hour-item').length, 24);
    assert.equal(datetime.querySelectorAll('.dp-minute-item').length, 2, 'default minute step is 30');
});

test('DateTimePicker (time): opening preselects the current time and clicking items writes HH:mm', async (t) => {
    const { wrappers } = await start(t, ['data-mode="time"']);
    const [w] = wrappers;
    const input = w.querySelector('.date-input');
    const picker = pickerOf(w);

    input.click();
    assert.ok(isOpen(w));
    // 10:00 is on a step boundary, so no rounding is involved (rounding is DP-0002)
    assert.equal(input.value, '10:00');
    assert.equal(selectedValue(picker, 'dp-hour-item'), '10');
    assert.equal(selectedValue(picker, 'dp-minute-item'), '00');

    timeItem(picker, 'dp-hour-item', '13').click();
    assert.equal(input.value, '13:00');
    timeItem(picker, 'dp-minute-item', '30').click();
    assert.equal(input.value, '13:30');
    assert.equal(timeItem(picker, 'dp-minute-item', '30').getAttribute('aria-selected'), 'true');
    assert.ok(isOpen(w), 'time mode stays open while picking');

    key(picker, 'Escape');
    assert.ok(!isOpen(w));
});

test('DateTimePicker (time): an existing HH:mm value is shown as the selection', async (t) => {
    const { wrappers } = await start(t, ['data-mode="time"']);
    const [w] = wrappers;
    const input = w.querySelector('.date-input');
    input.value = '08:30';
    input.click();
    assert.equal(selectedValue(pickerOf(w), 'dp-hour-item'), '08');
    assert.equal(selectedValue(pickerOf(w), 'dp-minute-item'), '30');
    assert.equal(input.value, '08:30');
});

test('DateTimePicker (datetime): a date click keeps it open and the value is YYYY/MM/DD HH:mm', async (t) => {
    const { wrappers } = await start(t, ['data-mode="datetime"']);
    const [w] = wrappers;
    const input = w.querySelector('.date-input');
    const picker = pickerOf(w);

    input.click();
    currentDay(w, 20).click();
    assert.ok(isOpen(w), 'datetime mode stays open after a date click');
    assert.equal(input.value, '2026/01/20 10:00');

    timeItem(picker, 'dp-hour-item', '14').click();
    assert.equal(input.value, '2026/01/20 14:00');
    timeItem(picker, 'dp-minute-item', '30').click();
    assert.equal(input.value, '2026/01/20 14:30');
});

test('DateTimePicker (datetime): clear empties the value and the time selection', async (t) => {
    const { wrappers } = await start(t, ['data-mode="datetime"']);
    const [w] = wrappers;
    const input = w.querySelector('.date-input');
    const picker = pickerOf(w);

    input.click();
    currentDay(w, 20).click();
    picker.querySelector('.clear-button').click();
    assert.equal(input.value, '');
    assert.ok(!isOpen(w));
    assert.equal(picker.querySelectorAll('.dp-time-item.selected').length, 0);
    assert.equal(picker.querySelectorAll('.calendar-day.selected').length, 0);
});

test('DateTimePicker: opening a picker of another mode closes the first', async (t) => {
    const { wrappers } = await start(t, ['data-mode="datetime"', 'data-mode="time"']);
    const [a, b] = wrappers;
    a.querySelector('.date-input').click();
    b.querySelector('.date-input').click();
    assert.ok(!isOpen(a));
    assert.ok(isOpen(b));
});

test('DateTimePicker (time/datetime): destroy removes the picker and the instance', async (t) => {
    const { DateTimePicker, wrappers, document } = await start(t, ['data-mode="time"', 'data-mode="datetime"']);
    for (const instance of [...DateTimePicker.instances]) instance.destroy();
    assert.equal(DateTimePicker.instances.length, 0);
    for (const w of wrappers) assert.equal(pickerOf(w), null);
    assert.equal(document.querySelectorAll('.dp-overlay').length, 0);
});
