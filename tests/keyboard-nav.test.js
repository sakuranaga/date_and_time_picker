/* DP-0003: keyboard navigation in the calendar moves by dates (README: ← → day, ↑ ↓ week, Home / End first / last
   enabled day of the month, PageUp / PageDown month), switching the displayed month when it crosses one. */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './helpers/dom.js';
import { NOW, wrapperHtml, pickerOf, display, key } from './helpers/picker.js';

let env = null;
afterEach(() => {
    const e = env;
    env = null;
    e?.cleanup();
});

const PICKERS = [
    ['datepicker', 'DatePicker', ''],
    ['datetimepicker', 'DateTimePicker (datetime)', 'data-mode="datetime"'],
];

async function open(t, moduleName, attrs, now = NOW) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now });
    env = setupDom(wrapperHtml(attrs, 0));
    await loadModule(moduleName);
    await settle();
    const wrapper = env.document.querySelector('.date-picker-wrapper');
    wrapper.querySelector('.date-input').click();
    return wrapper;
}

/** 'YYYY-M-D' of the focused day, read from the month display and the button; fails on an other-month cell. */
function focused(wrapper) {
    const el = env.document.activeElement;
    assert.ok(el?.classList.contains('calendar-day'), `a day is focused (got ${el?.tagName} ${el?.className})`);
    assert.ok(!el.classList.contains('other-month'), `the focused day ${el.textContent} belongs to the displayed month`);
    assert.ok(pickerOf(wrapper).contains(el));
    const [, y, m] = display(wrapper).match(/(\d+)年(\d+)月/);
    return `${y}-${m}-${el.textContent}`;
}

const press = (k, times = 1) => { for (let i = 0; i < times; i++) key(env.document.activeElement, k); };
const ymd = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const addDays = (base, n) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);

for (const [moduleName, label, attrs] of PICKERS) {
    test(`${label}: → and ← move one day at a time across months`, async (t) => {
        const wrapper = await open(t, moduleName, attrs);
        assert.equal(focused(wrapper), '2026-1-15');
        for (let n = 1; n <= 40; n++) {
            press('ArrowRight');
            assert.equal(focused(wrapper), ymd(addDays(NOW, n)), `after ${n} × →`);
        }
        for (let n = 39; n >= -50; n--) {
            press('ArrowLeft');
            assert.equal(focused(wrapper), ymd(addDays(NOW, n)), `back to offset ${n}`);
        }
    });

    test(`${label}: ↓ and ↑ move one week at a time across months`, async (t) => {
        const wrapper = await open(t, moduleName, attrs);
        for (let w = 1; w <= 8; w++) {
            press('ArrowDown');
            assert.equal(focused(wrapper), ymd(addDays(NOW, 7 * w)), `after ${w} × ↓`);
        }
        for (let w = 7; w >= -8; w--) {
            press('ArrowUp');
            assert.equal(focused(wrapper), ymd(addDays(NOW, 7 * w)), `back to week ${w}`);
        }
    });

    test(`${label}: PageDown / PageUp keep the day of the month, clamped to the month's length`, async (t) => {
        const wrapper = await open(t, moduleName, attrs, new Date(2026, 0, 31, 10, 0));
        assert.equal(focused(wrapper), '2026-1-31');
        press('PageDown');
        assert.equal(focused(wrapper), '2026-2-28');
        press('PageDown');
        assert.equal(focused(wrapper), '2026-3-28');
        press('PageUp', 3);
        assert.equal(focused(wrapper), '2025-12-28');
    });

    test(`${label}: PageDown from the 15th goes to the 15th of the next month`, async (t) => {
        const wrapper = await open(t, moduleName, attrs);
        press('PageDown');
        assert.equal(focused(wrapper), '2026-2-15');
        press('PageUp', 2);
        assert.equal(focused(wrapper), '2025-12-15');
    });

    test(`${label}: Home / End go to the first / last enabled day of the displayed month`, async (t) => {
        const wrapper = await open(t, moduleName, attrs);
        press('End');
        assert.equal(focused(wrapper), '2026-1-31');
        press('Home');
        assert.equal(focused(wrapper), '2026-1-1');
    });

    test(`${label}: Home / End respect min / max dates`, async (t) => {
        const wrapper = await open(t, moduleName, `${attrs} data-min-date="2026-01-10" data-max-date="2026-01-20"`);
        press('Home');
        assert.equal(focused(wrapper), '2026-1-10');
        press('End');
        assert.equal(focused(wrapper), '2026-1-20');
    });

    test(`${label}: moving past the min / max date leaves the focus where it is`, async (t) => {
        const wrapper = await open(t, moduleName, `${attrs} data-min-date="2026-01-14" data-max-date="2026-01-16"`);
        press('ArrowRight');
        assert.equal(focused(wrapper), '2026-1-16');
        press('ArrowRight');
        assert.equal(focused(wrapper), '2026-1-16');
        press('ArrowDown');
        assert.equal(focused(wrapper), '2026-1-16');
        press('PageDown');
        assert.equal(focused(wrapper), '2026-1-16');
        assert.equal(display(wrapper), '2026年1月');
        press('ArrowLeft', 2);
        assert.equal(focused(wrapper), '2026-1-14');
        press('ArrowLeft');
        assert.equal(focused(wrapper), '2026-1-14');
    });

    test(`${label}: Enter on a day reached across a month selects that date`, async (t) => {
        const wrapper = await open(t, moduleName, attrs);
        press('ArrowDown', 3); // 2026-2-5
        press('Enter');
        assert.match(wrapper.querySelector('.date-input').value, /^2026\/02\/05/);
    });
}
