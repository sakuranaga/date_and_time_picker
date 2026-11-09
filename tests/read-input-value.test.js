/* DP-0007: DatePicker / DateTimePicker (date, datetime) read the input's value when created and when opened. */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import {
    NOW, pickerOf, isOpen, display, currentDay, currentDays, next, key, timeItem, selectedValue, countChanges,
} from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

const escapeAttr = (v) => v.replace(/"/g, '&quot;');

/** Creates one wrapper whose input has `value`, counting change events from before the picker exists. */
async function start(t, moduleName, attrs, value) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(`<div class="date-picker-wrapper" ${attrs}><input class="date-input" value="${escapeAttr(value)}"></div>`);
    const wrapper = env.document.querySelector('.date-picker-wrapper');
    const input = wrapper.querySelector('.date-input');
    const changes = countChanges(input);
    const mod = await loadModule(moduleName);
    await settle();
    const Picker = Object.values(mod)[0];
    return { wrapper, input, changes, instance: Picker.instances[0] };
}

const selectedDays = (wrapper) => [...pickerOf(wrapper).querySelectorAll('.calendar-day.selected')];
const ymd = (d) => d && `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

for (const [moduleName, label, attrs] of [
    ['datepicker', 'DatePicker', ''],
    ['datetimepicker', 'DateTimePicker (date)', 'data-mode="date"'],
]) {
    test(`${label}: an initial value is read when the picker is created (no write, no change)`, async (t) => {
        const { input, changes, instance } = await start(t, moduleName, attrs, '2025/12/01');
        assert.equal(ymd(instance.selectedDate), '2025-12-1');
        assert.equal(instance.viewDate.getFullYear(), 2025);
        assert.equal(instance.viewDate.getMonth(), 11);
        assert.equal(input.value, '2025/12/01');
        assert.equal(changes(), 0);
    });

    test(`${label}: opening shows the month of the value with its day selected`, async (t) => {
        const { wrapper, input, changes } = await start(t, moduleName, attrs, '2025/12/01');
        input.click();
        assert.equal(display(wrapper), '2025年12月');
        assert.ok(currentDay(wrapper, 1).classList.contains('selected'));
        assert.ok(!pickerOf(wrapper).querySelector('.clear-button').disabled);
        assert.equal(input.value, '2025/12/01');
        assert.equal(changes(), 0);
    });

    test(`${label}: the value is read with data-format, and another shape is not read`, async (t) => {
        const ok = await start(t, moduleName, `${attrs} data-format="YYYY-MM-DD"`, '2025-12-01');
        ok.input.click();
        assert.equal(display(ok.wrapper), '2025年12月');
        assert.ok(currentDay(ok.wrapper, 1).classList.contains('selected'));
        env.cleanup();
        env = null;

        const other = await start(t, moduleName, `${attrs} data-format="YYYY-MM-DD"`, '2025/12/01');
        other.input.click();
        assert.equal(display(other.wrapper), '2026年1月');
        assert.equal(selectedDays(other.wrapper).length, 0);
        assert.equal(other.input.value, '2025/12/01');
    });

    for (const bad of ['abc', '2026/02/31', '2026/1/5', '2026/01/05 10:00']) {
        test(`${label}: an unreadable value ("${bad}") selects nothing and is left as is`, async (t) => {
            const { wrapper, input, changes, instance } = await start(t, moduleName, attrs, bad);
            assert.equal(instance.selectedDate, null);
            input.click();
            assert.equal(selectedDays(wrapper).length, 0);
            assert.equal(input.value, bad);
            assert.equal(changes(), 0);
        });
    }

    test(`${label}: a value changed by a script while closed is read on the next opening`, async (t) => {
        const { wrapper, input } = await start(t, moduleName, attrs, '2025/12/01');
        input.click();
        key(pickerOf(wrapper), 'Escape');

        input.value = '2026/03/10';
        input.click();
        assert.equal(display(wrapper), '2026年3月');
        assert.ok(currentDay(wrapper, 10).classList.contains('selected'));
        key(pickerOf(wrapper), 'Escape');

        input.value = '';
        input.click();
        assert.equal(selectedDays(wrapper).length, 0);
        assert.ok(pickerOf(wrapper).querySelector('.clear-button').disabled);
    });

    test(`${label}: a value outside min/max is selected as is (on a disabled day) and not rewritten`, async (t) => {
        const { wrapper, input } = await start(t, moduleName, `${attrs} data-max-date="2025-11-30"`, '2025/12/01');
        input.click();
        const day = currentDay(wrapper, 1);
        assert.ok(day.classList.contains('selected'));
        assert.ok(day.disabled);
        assert.equal(input.value, '2025/12/01');
    });

    test(`${label}: when the value is the selected day, reopening keeps the month moved to (unchanged)`, async (t) => {
        const { wrapper, input } = await start(t, moduleName, attrs, '');
        input.click();
        pickerOf(wrapper).querySelector('.today-button').click(); // selects today (a Date with a time of day)
        assert.equal(input.value, '2026/01/15');
        input.click();
        next(wrapper);
        key(pickerOf(wrapper), 'Escape');
        input.click();
        assert.equal(display(wrapper), '2026年2月');
    });
}

/* datetime */

test('DateTimePicker (datetime): a date and time value is read; clicking an hour then updates it', async (t) => {
    const { wrapper, input, changes, instance } = await start(t, 'datetimepicker', 'data-mode="datetime"', '2025/12/01 08:30');
    assert.equal(ymd(instance.selectedDate), '2025-12-1');
    assert.equal(changes(), 0);

    input.click();
    const picker = pickerOf(wrapper);
    assert.equal(display(wrapper), '2025年12月');
    assert.ok(currentDay(wrapper, 1).classList.contains('selected'));
    assert.equal(selectedValue(picker, 'dp-hour-item'), '08');
    assert.equal(selectedValue(picker, 'dp-minute-item'), '30');
    assert.equal(input.value, '2025/12/01 08:30');
    assert.equal(changes(), 1, 'opening writes once (DP-0001)');

    timeItem(picker, 'dp-hour-item', '14').click();
    assert.equal(input.value, '2025/12/01 14:30');
});

test('DateTimePicker (datetime): a date-only value is read and the current time is added on opening', async (t) => {
    const { wrapper, input, changes } = await start(t, 'datetimepicker', 'data-mode="datetime"', '2025/12/01');
    input.click();
    assert.ok(currentDay(wrapper, 1).classList.contains('selected'));
    assert.equal(input.value, '2025/12/01 10:00');
    assert.equal(changes(), 1);
    assert.ok(isOpen(wrapper));
});

test('DateTimePicker (datetime): an unreadable value selects no date and is left as is', async (t) => {
    const { wrapper, input, changes } = await start(t, 'datetimepicker', 'data-mode="datetime"', '2025/12/01 8:5');
    input.click();
    assert.equal(selectedDays(wrapper).length, 0);
    assert.equal(input.value, '2025/12/01 8:5');
    assert.equal(changes(), 0);
    assert.equal(currentDays(wrapper).length, 31, 'today\'s month is shown');
});

test('a format without one of YYYY / MM / DD is not read back, so the picked day stays selected', async (t) => {
    const { wrapper, input, instance } = await start(t, 'datepicker', 'data-format="YYYY/MM"', '2025/12');
    assert.equal(instance.selectedDate, null, 'such a value cannot be read');
    input.click();
    currentDay(wrapper, 20).click();
    assert.equal(input.value, '2026/01');
    input.click();
    assert.ok(currentDay(wrapper, 20).classList.contains('selected'), 'the selection is kept on reopening');
});

test('a value in the year 99 is shown, navigated and picked in the year 99 (not 1999)', async (t) => {
    const { wrapper, input } = await start(t, 'datepicker', '', '99/05/06');
    input.click();
    assert.equal(display(wrapper), '99年5月');
    assert.ok(currentDay(wrapper, 6).classList.contains('selected'));
    key(env.document.activeElement, 'ArrowRight');
    assert.equal(env.document.activeElement, currentDay(wrapper, 7));
    key(env.document.activeElement, 'PageDown');
    assert.equal(display(wrapper), '99年6月');
    next(wrapper);
    assert.equal(display(wrapper), '99年7月');
    currentDay(wrapper, 10).click();
    assert.equal(input.value, '99/07/10');
});

test('min / max dates in the year 99 are compared in the year 99', async (t) => {
    const { wrapper, input } = await start(t, 'datepicker', 'data-min-date="0099-05-05" data-max-date="0099-05-20"', '99/05/06');
    input.click();
    assert.ok(currentDay(wrapper, 4).disabled);
    assert.ok(!currentDay(wrapper, 5).disabled);
    assert.ok(!currentDay(wrapper, 20).disabled);
    assert.ok(currentDay(wrapper, 21).disabled);
});
