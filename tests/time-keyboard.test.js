/* DP-0008: keyboard operation of the hour / minute columns (DateTimePicker time / datetime, TimePicker). */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, wrapperHtml, pickerOf, key, countChanges } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

const VARIANTS = {
    'DateTimePicker (time)': { module: 'datetimepicker', html: wrapperHtml('data-mode="time"', 0), item: 'dp' },
    'DateTimePicker (datetime)': { module: 'datetimepicker', html: wrapperHtml('data-mode="datetime"', 0), item: 'dp' },
    TimePicker: {
        module: 'timepicker',
        html: '<div class="tp-wrapper"><input type="text" id="t0" class="tp-input" readonly></div>',
        item: 'tp',
    },
};

async function start(t, name) {
    const v = VARIANTS[name];
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    env = setupDom(`${v.html}<button type="button" id="next">next</button>`);
    const mod = await loadModule(v.module);
    await settle();
    const input = env.document.querySelector('.date-input, .tp-input');
    const root = () => input.parentElement.querySelector('.date-picker, .tp-popup');
    const items = (kind) => [...root().querySelectorAll(`.${v.item}-${kind}-item`)];
    const item = (kind, value) => items(kind).find((i) => i.dataset.value === value);
    const selected = (kind) => items(kind).find((i) => i.classList.contains('selected'))?.dataset.value ?? null;
    const tabbable = (kind) => items(kind).filter((i) => i.getAttribute('tabindex') === '0').map((i) => i.dataset.value);
    const open = () => root().classList.contains('show');
    const changes = countChanges(input);
    return { mod, input, root, items, item, selected, tabbable, open, changes, document: env.document };
}

const active = () => env.document.activeElement;
const press = (k, init) => key(active(), k, init);

for (const name of ['DateTimePicker (time)', 'TimePicker']) {
    test(`${name}: opening focuses the selected hour; only the selected items are tabbable`, async (t) => {
        const p = await start(t, name);
        p.input.click();
        assert.equal(active(), p.item('hour', '10'));
        assert.deepEqual(p.tabbable('hour'), ['10']);
        assert.deepEqual(p.tabbable('minute'), ['00']);
    });

    test(`${name}: ↑ ↓ Home End move and select at once (one change per move), stopping at the ends`, async (t) => {
        const p = await start(t, name);
        p.input.click();
        const changes = () => p.changes();
        const before = changes();

        press('ArrowDown');
        assert.equal(active(), p.item('hour', '11'));
        assert.equal(p.selected('hour'), '11');
        assert.deepEqual(p.tabbable('hour'), ['11']);
        assert.equal(p.input.value, '11:00');
        assert.equal(changes() - before, 1);

        press('ArrowUp');
        press('ArrowUp');
        assert.equal(p.selected('hour'), '09');
        assert.equal(p.input.value, '09:00');
        press('Home');
        assert.equal(active(), p.item('hour', '00'));
        assert.equal(p.input.value, '00:00');
        press('End');
        assert.equal(active(), p.item('hour', '23'));
        assert.equal(p.input.value, '23:00');

        const atEnd = changes();
        const event = press('ArrowDown');
        assert.ok(event.defaultPrevented, 'the key is still handled (no page scroll)');
        assert.equal(active(), p.item('hour', '23'));
        assert.equal(changes(), atEnd, 'no change at the end');
        press('ArrowUp', {});
        assert.equal(p.selected('hour'), '22');
    });

    test(`${name}: → / ← move between the columns without changing the value`, async (t) => {
        const p = await start(t, name);
        p.input.click();
        const before = p.changes();
        press('ArrowRight');
        assert.equal(active(), p.item('minute', '00'));
        assert.equal(p.changes(), before);
        press('ArrowDown');
        assert.equal(p.selected('minute'), '30');
        assert.equal(p.input.value, '10:30');
        press('ArrowLeft');
        assert.equal(active(), p.item('hour', '10'));
    });

    test(`${name}: Enter and Escape close the picker and return to the input, keeping the value`, async (t) => {
        const p = await start(t, name);
        p.input.click();
        press('ArrowDown');
        press('Enter');
        assert.ok(!p.open());
        assert.equal(active(), p.input);
        assert.equal(p.input.value, '11:00');

        p.input.click();
        press('ArrowRight');
        press('Escape');
        assert.ok(!p.open());
        assert.equal(active(), p.input);
    });

    test(`${name}: after clear, the first items are the tabbable ones`, async (t) => {
        const p = await start(t, name);
        p.input.click();
        p.root().querySelector('.clear-button, .tp-clear-button').click();
        assert.deepEqual(p.tabbable('hour'), ['00']);
        assert.deepEqual(p.tabbable('minute'), ['00']);
    });
}

test('DateTimePicker (datetime): the calendar keeps the focus on opening; the time items are in the focus trap', async (t) => {
    const p = await start(t, 'DateTimePicker (datetime)');
    p.input.click();
    assert.ok(active().classList.contains('calendar-day'));
    const trap = [...p.root().querySelectorAll('button:not([disabled]):not([tabindex="-1"]), [role="option"][tabindex="0"]')];
    assert.deepEqual(trap.slice(-2), [p.item('hour', '10'), p.item('minute', '00')]);
});

test('DateTimePicker (datetime): with no date picked, moving in the hour column selects without writing', async (t) => {
    const p = await start(t, 'DateTimePicker (datetime)');
    p.input.click();
    const before = p.changes();
    p.item('hour', '10').focus();
    press('ArrowDown');
    assert.equal(p.selected('hour'), '11');
    assert.equal(active(), p.item('hour', '11'));
    assert.equal(p.input.value, '');
    assert.equal(p.changes(), before);
});

/* TimePicker: closing when the focus goes to an element outside the popup */

test('TimePicker: focus moving to an element outside the popup (or back to the input) closes it', async (t) => {
    const p = await start(t, 'TimePicker');
    p.input.click();
    p.document.getElementById('next').focus();
    assert.ok(!p.open());
    assert.ok(!p.document.getElementById('tp-global-overlay').classList.contains('show'));

    p.input.click();
    assert.ok(p.open());
    p.input.focus(); // Shift+Tab back to the input
    assert.ok(!p.open());
});

test('TimePicker: moving inside the popup or losing the focus does not close it; Escape on the popup does', async (t) => {
    const p = await start(t, 'TimePicker');
    p.input.click();
    p.root().querySelector('.tp-clear-button').focus();
    assert.ok(p.open());
    p.root().focus();
    assert.ok(p.open());
    active().blur();
    assert.ok(p.open(), 'losing the focus (e.g. to another window) keeps it open');

    // a click on the popup's padding brings the focus back into the popup, so Escape works
    p.root().querySelector('.tp-container').click();
    assert.equal(active(), p.root());
    press('Escape');
    assert.ok(!p.open());
    assert.equal(active(), p.input);
});

test('TimePicker: the popup is a non-modal dialog that can hold the focus', async (t) => {
    const p = await start(t, 'TimePicker');
    assert.equal(p.root().getAttribute('role'), 'dialog');
    assert.equal(p.root().hasAttribute('aria-modal'), false);
    assert.equal(p.root().getAttribute('tabindex'), '-1');
});

test('TimePicker: after destroy, focus changes do nothing', async (t) => {
    const p = await start(t, 'TimePicker');
    p.input.click();
    p.mod.TimePicker.instances[0].destroy();
    p.document.getElementById('next').focus();
    p.input.focus();
    assert.equal(p.mod.TimePicker.instances.length, 0);
});

test('TimePicker: a click on the padding of a column also keeps the focus in the popup, so Escape works', async (t) => {
    const p = await start(t, 'TimePicker');
    p.input.click();
    active().blur();
    p.root().querySelector('.tp-hour-column').click();
    assert.ok(p.root().contains(active()));
    press('Escape');
    assert.ok(!p.open());
    assert.equal(active(), p.input);
});

test('TimePicker: clicking an hour or a minute does not reach the document (the picker stays open)', async (t) => {
    const p = await start(t, 'TimePicker');
    let reached = 0;
    p.document.addEventListener('click', () => { reached += 1; });
    p.input.click();
    reached = 0;
    p.item('hour', '13').click();
    p.item('minute', '30').click();
    assert.equal(reached, 0);
    assert.ok(p.open());
    assert.equal(p.input.value, '13:30');
});
