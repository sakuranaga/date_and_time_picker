/* DP-0014: TimePicker.setValue() also updates the selection shown in the columns; unused code is gone. */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, countChanges } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

async function start(t) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom('<div class="tp-wrapper"><input type="text" id="t0" class="tp-input"></div>');
    const { TimePicker } = await loadModule('timepicker');
    await settle();
    const input = env.document.getElementById('t0');
    const popup = input.parentElement.querySelector('.tp-popup');
    return { TimePicker, picker: TimePicker.instances[0], input, popup };
}

const selected = (popup, kind) => [...popup.querySelectorAll(`.tp-${kind}-item.selected`)].map((i) => i.dataset.value);
const tabbable = (popup, kind) => [...popup.querySelectorAll(`.tp-${kind}-item[tabindex="0"]`)].map((i) => i.dataset.value);

test('TimePicker.setValue() shows the time as the selection (without opening, without change)', async (t) => {
    const { picker, input, popup } = await start(t);
    const changes = countChanges(input);
    picker.setValue('09:30');
    assert.equal(input.value, '09:30');
    assert.equal(picker.getValue(), '09:30');
    assert.deepEqual(selected(popup, 'hour'), ['09']);
    assert.deepEqual(selected(popup, 'minute'), ['30']);
    assert.equal(popup.querySelector('.tp-hour-item.selected').getAttribute('aria-selected'), 'true');
    assert.deepEqual(tabbable(popup, 'hour'), ['09']);
    assert.ok(!popup.classList.contains('show'));
    assert.equal(changes(), 0, 'a value set by a script fires no change, like input.value');

    picker.setValue('13:00');
    assert.deepEqual(selected(popup, 'hour'), ['13']);
    assert.deepEqual(selected(popup, 'minute'), ['00']);
});

test('TimePicker.setValue() ignores a value that is not HH:mm', async (t) => {
    const { picker, input, popup } = await start(t);
    picker.setValue('09:30');
    picker.setValue('9:30');
    picker.setValue('');
    assert.equal(input.value, '09:30');
    assert.deepEqual(selected(popup, 'hour'), ['09']);
});

test('TimePicker: the unused scrollToItem() and the unused format option are gone', async (t) => {
    const { TimePicker, picker } = await start(t);
    assert.equal(TimePicker.prototype.scrollToItem, undefined);
    assert.equal('format' in picker.config, false);
});
