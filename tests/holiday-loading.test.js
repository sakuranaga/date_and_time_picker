/* DP-0012: auto-initialization does not wait for holiday.csv; holidays are applied when they arrive;
   no fetch when no picker uses a calendar. */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, wrapperHtml, pickerOf, isOpen, currentDay, key, countChanges } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

/** A fetch whose answer is given later by the test. */
function deferredFetch() {
    const calls = [];
    const pending = [];
    const fetch = (url) => {
        calls.push(String(url));
        return new Promise((resolve) => pending.push(resolve));
    };
    const answer = (response) => { for (const resolve of pending.splice(0)) resolve(response); };
    return {
        fetch,
        calls,
        respond: async (text) => { answer({ ok: true, status: 200, text: async () => text }); await settle(); },
        fail: async () => { answer({ ok: false, status: 404, text: async () => '' }); await settle(); },
    };
}

async function start(t, moduleName, html) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(html);
    const deferred = deferredFetch();
    globalThis.fetch = deferred.fetch; // restored by cleanup()
    const mod = await loadModule(moduleName);
    await settle();
    return { mod, Picker: Object.values(mod)[0], deferred, document: env.document };
}

const HOLIDAYS = '2026/1/12,成人の日\n';
const active = () => env.document.activeElement;

for (const [moduleName, attrs] of [['datepicker', ''], ['datetimepicker', 'data-mode="datetime"']]) {
    test(`${moduleName}: pickers are usable before holiday.csv answers`, async (t) => {
        const { Picker, deferred, document } = await start(t, moduleName, wrapperHtml(attrs, 0));
        assert.equal(deferred.calls.length, 1, 'holiday.csv is being fetched');
        assert.equal(Picker.instances.length, 1, 'the picker exists already');
        const w = document.getElementById('w0');
        w.querySelector('.date-input').click();
        assert.ok(isOpen(w));
        currentDay(w, 20).click();
        assert.match(w.querySelector('.date-input').value, /^2026\/01\/20/);
    });
}

test('holidays arriving while the calendar is open are shown at once; focus and keys keep working', async (t) => {
    const { deferred, document } = await start(t, 'datepicker', wrapperHtml('', 0));
    const w = document.getElementById('w0');
    w.querySelector('.date-input').click();
    assert.equal(active(), currentDay(w, 15));
    assert.ok(!currentDay(w, 12).classList.contains('holiday'));

    await deferred.respond(HOLIDAYS);
    assert.ok(currentDay(w, 12).classList.contains('holiday'));
    assert.equal(active(), currentDay(w, 15), 'the focused day keeps the focus after the redraw');
    key(active(), 'ArrowRight');
    assert.equal(active(), currentDay(w, 16));
    key(active(), 'Enter');
    assert.equal(w.querySelector('.date-input').value, '2026/01/16');
});

test('holidays arriving while closed are shown on the next opening', async (t) => {
    const { deferred, document } = await start(t, 'datepicker', wrapperHtml('', 0));
    await deferred.respond(HOLIDAYS);
    const w = document.getElementById('w0');
    w.querySelector('.date-input').click();
    assert.ok(currentDay(w, 12).classList.contains('holiday'));
});

test('datetime: holidays arriving while a time item has the focus keep the time column as it is', async (t) => {
    const { deferred, document } = await start(t, 'datetimepicker', wrapperHtml('data-mode="datetime"', 0));
    const w = document.getElementById('w0');
    const input = w.querySelector('.date-input');
    input.click();
    currentDay(w, 20).click();
    const hour = pickerOf(w).querySelector('.dp-hour-item.selected');
    hour.focus();
    const changes = countChanges(input);
    const value = input.value;

    await deferred.respond(HOLIDAYS);
    assert.ok(currentDay(w, 12).classList.contains('holiday'));
    assert.equal(active(), hour, 'the hour item keeps the focus (only the calendar is redrawn)');
    assert.equal(pickerOf(w).querySelector('.dp-hour-item.selected'), hour);
    assert.equal(input.value, value);
    assert.equal(changes(), 0);
});

test('a time-only page does not fetch holiday.csv; a page with a calendar fetches it once', async (t) => {
    const timeOnly = await start(t, 'datetimepicker', wrapperHtml('data-mode="time"', 0) + wrapperHtml('data-mode="time"', 1));
    assert.equal(timeOnly.deferred.calls.length, 0);
    assert.equal(timeOnly.Picker.instances.length, 2);
    env.cleanup();
    env = null;
    t.mock.timers.reset();

    const mixed = await start(t, 'datetimepicker', wrapperHtml('data-mode="time"', 0) + wrapperHtml('data-mode="date"', 1));
    assert.equal(mixed.deferred.calls.length, 1);
});

test('a failed fetch leaves the pickers without holidays and without errors', async (t) => {
    const { deferred, document } = await start(t, 'datepicker', wrapperHtml('', 0));
    const w = document.getElementById('w0');
    w.querySelector('.date-input').click();
    await deferred.fail();
    assert.equal(w.querySelectorAll('.calendar-day.holiday').length, 0);
    assert.ok(isOpen(w));
});

test('holidays arriving after the picker was destroyed and remade by hand do not touch the new picker', async (t) => {
    const { Picker, deferred, document } = await start(t, 'datepicker', wrapperHtml('', 0));
    const w = document.getElementById('w0');
    w.querySelector('.date-input').click();
    Picker.instances[0].destroy();
    const manual = new Picker(w, { holidays: new Set(['2026/1/13']) });
    w.querySelector('.date-input').click();

    await deferred.respond(HOLIDAYS);
    assert.deepEqual([...manual.holidays], ['2026/1/13']);
    assert.ok(!currentDay(w, 12).classList.contains('holiday'));
    assert.ok(currentDay(w, 13).classList.contains('holiday'));
    assert.equal(Picker.instances.length, 1);
    assert.equal(w.querySelectorAll('.date-picker').length, 1);
});
