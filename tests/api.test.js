/* Public API of the three entry modules (kept unchanged by the DP-0010 refactoring). */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, isOpen } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

async function start(t, html, name) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(html);
    const mod = await loadModule(name);
    await settle();
    return mod;
}

test('each entry exports exactly its class', async (t) => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom('');
    assert.deepEqual(Object.keys(await loadModule('datepicker')), ['DatePicker']);
    assert.deepEqual(Object.keys(await loadModule('datetimepicker')), ['DateTimePicker']);
    assert.deepEqual(Object.keys(await loadModule('timepicker')), ['TimePicker']);
});

test('the classes keep their public methods', async (t) => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom('');
    const { DatePicker } = await loadModule('datepicker');
    const { DateTimePicker } = await loadModule('datetimepicker');
    const { TimePicker } = await loadModule('timepicker');
    for (const Picker of [DatePicker, DateTimePicker]) {
        for (const m of ['show', 'hide', 'closePicker', 'destroy']) {
            assert.equal(typeof Picker.prototype[m], 'function', `${Picker.name}.prototype.${m}`);
        }
        assert.ok(Array.isArray(Picker.instances));
    }
    for (const m of ['openPicker', 'closePicker', 'setValue', 'getValue', 'selectHour', 'selectMinute',
        'scrollToItem', 'scrollToSelection', 'destroy']) {
        assert.equal(typeof TimePicker.prototype[m], 'function', `TimePicker.prototype.${m}`);
    }
    assert.equal(typeof TimePicker.closeAllPickers, 'function');
    assert.ok(Array.isArray(TimePicker.instances));
});

const customHtml = '<div class="date-picker-wrapper" id="auto"><input class="date-input"></div>'
    + '<div id="custom"><input class="date-input"></div>';

for (const [name, className] of [['datepicker', 'DatePicker'], ['datetimepicker', 'DateTimePicker']]) {
    test(`${className}: a user subclass with its own static instances still registers in ${className}.instances`, async (t) => {
        const mod = await start(t, customHtml, name);
        const Base = mod[className];
        class Custom extends Base { static instances = []; }

        const auto = env.document.getElementById('auto');
        const custom = env.document.getElementById('custom');
        const picker = new Custom(custom);
        assert.equal(Base.instances.length, 2);
        assert.ok(Base.instances.includes(picker));
        assert.equal(Custom.instances.length, 0);

        // the subclass instance and the auto-initialized one close each other
        custom.querySelector('.date-input').click();
        assert.ok(isOpen(custom));
        auto.querySelector('.date-input').click();
        assert.ok(!isOpen(custom));
        assert.ok(isOpen(auto));

        picker.destroy();
        assert.equal(Base.instances.length, 1);
    });
}

test('generateTimeOptions re-renders the minutes with the current config.minuteStep', async (t) => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom('<div class="date-picker-wrapper" data-mode="time"><input class="date-input"></div>'
        + '<div class="tp-wrapper"><input class="tp-input"></div>');
    const { DateTimePicker } = await loadModule('datetimepicker');
    const { TimePicker } = await loadModule('timepicker');
    await settle();
    const minutes = (root, cls) => [...root.querySelectorAll(cls)].map((i) => i.dataset.value);

    const dtp = DateTimePicker.instances[0];
    dtp.config.minuteStep = 15;
    dtp.generateTimeOptions();
    assert.deepEqual(minutes(dtp.picker, '.dp-minute-item'), ['00', '15', '30', '45']);

    const tp = TimePicker.instances[0];
    tp.config.minuteStep = 20;
    tp.generateTimeOptions();
    assert.deepEqual(minutes(tp.popup, '.tp-minute-item'), ['00', '20', '40']);
});
