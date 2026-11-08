/* DP-0001: opening a time picker writes the value once (one change), TimePicker does not open on focus,
   and the time-only pickers have a clear button. */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, wrapperHtml, pickerOf, isOpen, currentDay, key, timeItem } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

/** Records every change event with the input value and the selected hour / minute at that moment. */
function recordChanges(input, root, hourCls, minuteCls) {
    const events = [];
    input.addEventListener('change', () => {
        events.push({
            value: input.value,
            hour: root.querySelector(`.${hourCls}.selected`)?.dataset.value ?? null,
            minute: root.querySelector(`.${minuteCls}.selected`)?.dataset.value ?? null,
        });
    });
    return { take: () => events.splice(0) };
}

/* ---------------- TimePicker ---------------- */

async function startTimePicker(t) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom('<div class="tp-wrapper"><input type="text" id="t" class="tp-input" readonly></div>'
        + '<button type="button" id="next">next</button>');
    const { TimePicker } = await loadModule('timepicker');
    await settle();
    const input = env.document.getElementById('t');
    const popup = input.parentElement.querySelector('.tp-popup');
    const changes = recordChanges(input, popup, 'tp-hour-item', 'tp-minute-item');
    const open = () => popup.classList.contains('show');
    const close = () => key(input, 'Escape');
    return { TimePicker, input, popup, changes, open, close };
}

test('TimePicker: focus alone does not open it nor write a value (Tab through a form)', async (t) => {
    const { input, changes, open } = await startTimePicker(t);
    input.focus();
    assert.ok(!open());
    assert.equal(input.value, '');
    key(input, 'Tab');
    env.document.getElementById('next').focus();
    assert.equal(input.value, '');
    assert.deepEqual(changes.take(), []);
});

test('TimePicker: opening writes the value with a single change, notified in the final state', async (t) => {
    const { input, changes, open, close } = await startTimePicker(t);
    input.click();
    assert.ok(open());
    assert.deepEqual(changes.take(), [{ value: '10:00', hour: '10', minute: '00' }]);
    close();

    // reopening with a value while a previous selection exists
    input.value = '08:30';
    input.click();
    assert.equal(input.value, '08:30');
    assert.deepEqual(changes.take(), [{ value: '08:30', hour: '08', minute: '30' }]);
    close();

    // reopening with the same value
    input.click();
    assert.deepEqual(changes.take(), [{ value: '08:30', hour: '08', minute: '30' }]);
});

test('TimePicker: a value with neither hour nor minute (":") is left as is, with no change', async (t) => {
    const { input, changes, close } = await startTimePicker(t);
    input.value = ':';
    input.click();
    assert.equal(input.value, ':');
    assert.deepEqual(changes.take(), []);
    close();

    // with an existing selection, it must not be written back either
    input.value = '';
    input.click();
    changes.take();
    close();
    input.value = ':';
    input.click();
    assert.equal(input.value, ':');
    assert.deepEqual(changes.take(), []);
});

test('TimePicker: each click on an hour or a minute fires one change with the new value', async (t) => {
    const { input, popup, changes } = await startTimePicker(t);
    input.click();
    changes.take();
    timeItem(popup, 'tp-hour-item', '13').click();
    assert.deepEqual(changes.take(), [{ value: '13:00', hour: '13', minute: '00' }]);
    timeItem(popup, 'tp-minute-item', '30').click();
    assert.deepEqual(changes.take(), [{ value: '13:30', hour: '13', minute: '30' }]);
});

test('TimePicker: the clear button empties the value, fires change once, unselects, closes and focuses the input', async (t) => {
    const { input, popup, changes, open } = await startTimePicker(t);
    input.click();
    changes.take();
    const clear = popup.querySelector('.tp-clear-button');
    assert.ok(clear, 'clear button exists');
    assert.equal(clear.getAttribute('type'), 'button');

    clear.click();
    assert.equal(input.value, '');
    assert.deepEqual(changes.take(), [{ value: '', hour: null, minute: null }]);
    assert.equal(popup.querySelectorAll('.tp-item.selected').length, 0);
    assert.ok(!open());
    assert.equal(env.document.activeElement, input);

    input.click();
    assert.equal(input.value, '10:00');
});

/* ---------------- DateTimePicker ---------------- */

async function startDateTime(t, mode) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(wrapperHtml(`data-mode="${mode}"`, 0));
    const { DateTimePicker } = await loadModule('datetimepicker');
    await settle();
    const wrapper = env.document.querySelector('.date-picker-wrapper');
    const input = wrapper.querySelector('.date-input');
    const picker = pickerOf(wrapper);
    const changes = recordChanges(input, picker, 'dp-hour-item', 'dp-minute-item');
    const close = () => key(picker, 'Escape');
    return { wrapper, input, picker, changes, close };
}

test('DateTimePicker (time): opening and reopening write the value with a single change', async (t) => {
    const { input, changes, close } = await startDateTime(t, 'time');
    input.click();
    assert.deepEqual(changes.take(), [{ value: '10:00', hour: '10', minute: '00' }]);
    close();

    input.click();
    assert.deepEqual(changes.take(), [{ value: '10:00', hour: '10', minute: '00' }]);
    close();

    input.value = '08:30';
    input.click();
    assert.equal(input.value, '08:30');
    assert.deepEqual(changes.take(), [{ value: '08:30', hour: '08', minute: '30' }]);
});

test('DateTimePicker (time): each click on an hour or a minute fires one change with the new value', async (t) => {
    const { input, picker, changes } = await startDateTime(t, 'time');
    input.click();
    changes.take();
    timeItem(picker, 'dp-hour-item', '13').click();
    assert.deepEqual(changes.take(), [{ value: '13:00', hour: '13', minute: '00' }]);
    timeItem(picker, 'dp-minute-item', '30').click();
    assert.deepEqual(changes.take(), [{ value: '13:30', hour: '13', minute: '30' }]);
});

test('DateTimePicker (time): the clear button empties the value, fires change once, unselects, closes and focuses the input', async (t) => {
    const { wrapper, input, picker, changes } = await startDateTime(t, 'time');
    const clear = picker.querySelector('.clear-button');
    assert.ok(clear, 'clear button exists in time mode');
    assert.ok(picker.querySelector('.dp-time-controls'));

    input.click();
    changes.take();
    assert.ok(!clear.disabled, 'enabled while open (a value has been written)');

    clear.click();
    assert.equal(input.value, '');
    assert.deepEqual(changes.take(), [{ value: '', hour: null, minute: null }]);
    assert.equal(picker.querySelectorAll('.dp-time-item.selected').length, 0);
    assert.ok(!isOpen(wrapper));
    assert.equal(env.document.activeElement, input);

    input.click();
    assert.equal(input.value, '10:00');
});

test('DateTimePicker (datetime): reopening after a date was picked writes once', async (t) => {
    const { wrapper, input, changes, close } = await startDateTime(t, 'datetime');
    input.click();
    assert.deepEqual(changes.take(), [], 'no date yet: nothing is written (unchanged)');

    currentDay(wrapper, 20).click();
    assert.deepEqual(changes.take(), [{ value: '2026/01/20 10:00', hour: '10', minute: '00' }]);
    close();

    input.click();
    assert.deepEqual(changes.take(), [{ value: '2026/01/20 10:00', hour: '10', minute: '00' }]);
});
