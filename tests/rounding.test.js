/* DP-0002: opening a time picker near the end of an hour selects the next hour. */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { wrapperHtml } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

test('DateTimePicker (time): at 10:50 with a 30-minute step it opens on 11:00', async (t) => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: new Date(2026, 0, 15, 10, 50) });
    env = setupDom(wrapperHtml('data-mode="time"', 0));
    await loadModule('datetimepicker');
    await settle();
    const input = env.document.querySelector('.date-input');
    input.click();
    assert.equal(input.value, '11:00');
});

test('TimePicker: at 23:50 with a 30-minute step it opens on 00:00', async (t) => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: new Date(2026, 0, 15, 23, 50) });
    env = setupDom('<div class="tp-wrapper"><input type="text" class="tp-input" readonly></div>');
    await loadModule('timepicker');
    await settle();
    const input = env.document.querySelector('.tp-input');
    input.click();
    assert.equal(input.value, '00:00');
});
