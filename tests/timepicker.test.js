import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, key, timeItem, selectedValue } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

const inputHtml = (attrs = '', i = 0) =>
    `<div class="tp-wrapper"><input type="text" id="t${i}" class="tp-input" ${attrs} readonly></div>`;

async function start(t, inputs) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(inputs.map((attrs, i) => inputHtml(attrs, i)).join(''));
    const { TimePicker } = await loadModule('timepicker');
    await settle();
    return { TimePicker, document: env.document, inputs: [...env.document.querySelectorAll('.tp-input')] };
}

const popupOf = (input) => input.parentElement.querySelector('.tp-popup');
const isOpen = (input) => popupOf(input).classList.contains('show');

test('TimePicker: auto-initializes .tp-input with data-minute-step', async (t) => {
    const { TimePicker, inputs } = await start(t, ['', 'data-minute-step="15"']);
    assert.equal(TimePicker.instances.length, 2);
    const minutes = (input) => [...popupOf(input).querySelectorAll('.tp-minute-item')].map((i) => i.dataset.value);
    assert.deepEqual(minutes(inputs[0]), ['00', '30']);
    assert.deepEqual(minutes(inputs[1]), ['00', '15', '30', '45']);
    assert.equal(popupOf(inputs[0]).querySelectorAll('.tp-hour-item').length, 24);
});

test('TimePicker: a click opens it and picking an hour and a minute writes HH:mm', async (t) => {
    const { inputs, document } = await start(t, ['']);
    const [input] = inputs;
    input.click();
    assert.ok(isOpen(input));
    assert.ok(document.getElementById('tp-global-overlay').classList.contains('show'));
    // 10:00 is on a step boundary (rounding is DP-0002)
    assert.equal(input.value, '10:00');

    timeItem(popupOf(input), 'tp-hour-item', '13').click();
    timeItem(popupOf(input), 'tp-minute-item', '30').click();
    assert.equal(input.value, '13:30');
    assert.equal(selectedValue(popupOf(input), 'tp-hour-item'), '13');
    assert.equal(timeItem(popupOf(input), 'tp-minute-item', '30').getAttribute('aria-selected'), 'true');
});

test('TimePicker: an existing value is shown as the selection', async (t) => {
    const { inputs } = await start(t, ['']);
    const [input] = inputs;
    input.value = '08:30';
    input.click();
    assert.equal(selectedValue(popupOf(input), 'tp-hour-item'), '08');
    assert.equal(selectedValue(popupOf(input), 'tp-minute-item'), '30');
    assert.equal(input.value, '08:30');
});

test('TimePicker: Escape and the overlay close it', async (t) => {
    const { inputs, document } = await start(t, ['']);
    const [input] = inputs;
    // a real click focuses the input first; jsdom's click() does not, so focus it explicitly
    input.focus();
    input.click();
    assert.ok(isOpen(input));
    key(input, 'Escape');
    assert.ok(!isOpen(input));
    assert.equal(document.activeElement, input);

    input.click();
    document.getElementById('tp-global-overlay').click();
    assert.ok(!isOpen(input));
    assert.ok(!document.getElementById('tp-global-overlay').classList.contains('show'));
});

test('TimePicker: opening another picker closes the first', async (t) => {
    const { inputs } = await start(t, ['', '']);
    const [a, b] = inputs;
    a.click();
    b.click();
    assert.ok(!isOpen(a));
    assert.ok(isOpen(b));
});
