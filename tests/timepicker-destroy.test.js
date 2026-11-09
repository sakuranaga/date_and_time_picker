/* DP-0009: TimePicker.destroy() removes its listeners (input and document) and the shared overlay when it was the last. */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, key } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

/** Tracks the listeners currently registered on a target (added and not yet removed). */
function trackListeners(target) {
    const active = new Set();
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    target.addEventListener = (type, fn, options) => { active.add(`${type}:${fnId(fn)}`); add(type, fn, options); };
    target.removeEventListener = (type, fn, options) => { active.delete(`${type}:${fnId(fn)}`); remove(type, fn, options); };
    return active;
}
const ids = new WeakMap();
let nextId = 0;
const fnId = (fn) => { if (!ids.has(fn)) ids.set(fn, ++nextId); return ids.get(fn); };

async function start(t, inputs = 1) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    let html = '';
    for (let i = 0; i < inputs; i++) html += `<div class="tp-wrapper"><input type="text" id="t${i}" class="tp-input"></div>`;
    html += '<div class="tp-wrapper"><input type="text" id="manual"></div><button id="outside">outside</button>';
    env = setupDom(html);
    const { TimePicker } = await loadModule('timepicker');
    await settle();
    return { TimePicker, document: env.document };
}

const overlay = (document) => document.getElementById('tp-global-overlay');

test('TimePicker: destroy removes the listeners it added to the document and to the input', async (t) => {
    const { TimePicker, document } = await start(t, 1);
    const docListeners = trackListeners(document);
    const input = document.getElementById('manual');
    const inputListeners = trackListeners(input);

    const picker = new TimePicker(input);
    assert.ok(docListeners.size > 0, 'the picker listens on the document');
    assert.ok(inputListeners.size > 0, 'the picker listens on the input');
    picker.destroy();
    assert.deepEqual([...docListeners], [], 'no document listener is left');
    assert.deepEqual([...inputListeners], [], 'no input listener is left');
});

test('TimePicker: after destroy, keys and clicks on the input do nothing (no overlay over the page)', async (t) => {
    const { TimePicker, document } = await start(t, 2);
    const input = document.getElementById('t0');
    TimePicker.instances[0].destroy();

    key(input, 'ArrowDown');
    key(input, 'Enter');
    input.click();
    assert.equal(input.value, '');
    assert.ok(!overlay(document).classList.contains('show'), 'the overlay of the other picker is not shown');
    document.getElementById('outside').click();
});

test('TimePicker: the overlay is removed with the last picker and created again for a new one', async (t) => {
    const { TimePicker, document } = await start(t, 2);
    TimePicker.instances[0].destroy();
    assert.ok(overlay(document), 'kept while another picker exists');
    TimePicker.instances[0].destroy();
    assert.equal(overlay(document), null);
    assert.equal(TimePicker.instances.length, 0);

    const picker = new TimePicker(document.getElementById('manual'));
    assert.ok(overlay(document));
    document.getElementById('manual').click();
    assert.ok(overlay(document).classList.contains('show'));
    picker.destroy();
});

test('TimePicker: destroying an open picker hides the overlay; destroying a closed one keeps another open picker as is', async (t) => {
    const { TimePicker, document } = await start(t, 2);
    const [a, b] = TimePicker.instances;
    document.getElementById('t0').click();
    a.destroy();
    assert.ok(!overlay(document).classList.contains('show'));

    document.getElementById('t1').click();
    assert.ok(b.isOpen);
    const c = new TimePicker(document.getElementById('manual'));
    c.destroy();
    assert.ok(b.isOpen);
    assert.ok(overlay(document).classList.contains('show'), 'the open picker keeps its overlay');
});
