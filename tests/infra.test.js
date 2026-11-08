/* Checks of the test infrastructure itself (CSS stub, fresh module per load, jsdom error collection). */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';

test('a module that imports .css loads (the CSS is stubbed as an empty module)', async () => {
    const env = setupDom('');
    try {
        const mod = await loadModule('datepicker');
        assert.equal(typeof mod.DatePicker, 'function');
    } finally {
        env.cleanup();
    }
});

test('loadModule gives a fresh module each time (independent static instances)', async () => {
    const env = setupDom('<div class="date-picker-wrapper"><input class="date-input"></div>');
    try {
        const first = await loadModule('datepicker');
        await settle();
        const second = await loadModule('datepicker');
        assert.notEqual(first.DatePicker, second.DatePicker);
        assert.notEqual(first.DatePicker.instances, second.DatePicker.instances);
    } finally {
        // two auto-initialized copies share one wrapper here; only the module identity matters
        env.cleanup();
    }
});

test('an exception thrown in a jsdom event handler makes cleanup() fail', () => {
    const env = setupDom('<button id="b">b</button>');
    env.document.getElementById('b').addEventListener('click', () => { throw new Error('boom in handler'); });
    env.document.getElementById('b').click();
    assert.throws(() => env.cleanup(), /boom in handler/);
});

test('cleanup() restores the globals it replaced', () => {
    const before = globalThis.Event;
    const env = setupDom('');
    assert.notEqual(globalThis.Event, before);
    assert.equal(globalThis.document, env.document);
    env.cleanup();
    assert.equal(globalThis.Event, before);
    assert.equal(globalThis.document, undefined);
});
