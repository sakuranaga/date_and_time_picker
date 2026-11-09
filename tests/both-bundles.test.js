/* DP-0011: datepicker.js and datetimepicker.js on the same page: a wrapper gets one picker only, and the shared
   .dp-overlay is never removed while a picker of the other class still uses it (no TypeError). */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, wrapperHtml, pickerOf, isOpen, currentDay, key } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup(); // also fails the test on any exception thrown inside jsdom handlers (e.g. a TypeError)
});

async function start(t, html) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(html + '<button id="outside">outside</button>');
    const { DatePicker } = await loadModule('datepicker');
    const { DateTimePicker } = await loadModule('datetimepicker');
    await settle();
    return { DatePicker, DateTimePicker, document: env.document };
}

const overlay = (document) => document.querySelector('.dp-overlay');

test('both scripts on one page: every wrapper gets exactly one picker', async (t) => {
    const { DatePicker, DateTimePicker, document } = await start(t, wrapperHtml('', 0) + wrapperHtml('', 1));
    for (const wrapper of document.querySelectorAll('.date-picker-wrapper')) {
        assert.equal(wrapper.querySelectorAll('.date-picker').length, 1);
    }
    assert.equal(DatePicker.instances.length + DateTimePicker.instances.length, 2);
    assert.equal(document.querySelectorAll('.dp-overlay').length, 1);

    // and it works: open, pick, close
    const w = document.getElementById('w0');
    w.querySelector('.date-input').click();
    assert.ok(isOpen(w));
    currentDay(w, 20).click();
    assert.equal(w.querySelector('.date-input').value, '2026/01/20');
});

test('the overlay stays while a picker of the other class exists; opening it then does not throw', async (t) => {
    const html = '<div id="a"><input class="date-input"></div><div id="b"><input class="date-input"></div>';
    const { DatePicker, DateTimePicker, document } = await start(t, html);
    const a = new DatePicker(document.getElementById('a'));
    const b = new DateTimePicker(document.getElementById('b'), { mode: 'datetime' });

    a.destroy();
    assert.ok(overlay(document), 'kept for the DateTimePicker');
    document.querySelector('#b .date-input').click();
    assert.ok(isOpen(document.getElementById('b')));
    assert.ok(overlay(document).classList.contains('show'));
    key(pickerOf(document.getElementById('b')), 'Escape');
    assert.ok(!overlay(document).classList.contains('show'));

    b.destroy();
    assert.equal(overlay(document), null, 'removed with the last picker of any class');
});

test('hiding a picker keeps the overlay while a picker of the other class is open', async (t) => {
    const html = '<div id="a"><input class="date-input"></div><div id="b"><input class="date-input"></div>';
    const { DatePicker, DateTimePicker, document } = await start(t, html);
    const a = new DatePicker(document.getElementById('a'));
    new DateTimePicker(document.getElementById('b'));
    document.querySelector('#b .date-input').click();
    a.hide();
    assert.ok(overlay(document).classList.contains('show'));
});

test('a destroyed wrapper can be initialized again', async (t) => {
    const { DatePicker, DateTimePicker, document } = await start(t, wrapperHtml('', 0));
    const wrapper = document.getElementById('w0');
    const owner = [...DatePicker.instances, ...DateTimePicker.instances];
    assert.equal(owner.length, 1, 'one picker for the wrapper');
    owner[0].destroy();
    assert.equal(wrapper.querySelectorAll('.date-picker').length, 0);

    const again = new DatePicker(wrapper);
    assert.equal(wrapper.querySelectorAll('.date-picker').length, 1);
    wrapper.querySelector('.date-input').click();
    assert.ok(isOpen(wrapper));
    again.destroy();
    assert.equal(wrapper.querySelectorAll('.date-picker').length, 0);
});
