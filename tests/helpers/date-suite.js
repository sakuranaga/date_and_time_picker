/* Characterization tests for the date (calendar) mode, shared by DatePicker and DateTimePicker (mode="date").
   Fixes today's correct behaviour only; known bugs (DP-0001..0014) are not pinned here. */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupDom, loadModule, settle } from './dom.js';
import {
    NOW, wrapperHtml, pickerOf, isOpen, overlay, display, currentDay, currentDays,
    next, prev, key, countChanges,
} from './picker.js';

/**
 * @param {string} moduleName  'datepicker' | 'datetimepicker'
 * @param {string} className   exported class name
 * @param {string} modeAttrs   extra wrapper attributes (e.g. 'data-mode="date"')
 */
export function runDateSuite(moduleName, className, modeAttrs = '') {
    const label = modeAttrs ? `${className} [${modeAttrs}]` : className;
    let env = null;
    afterEach(() => {
        const e = env;
        env = null;
        e?.cleanup();
    });

    async function start(t, { attrs = '', count = 1, holidays = null } = {}) {
        t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
        let html = '';
        for (let i = 0; i < count; i++) html += wrapperHtml(`${modeAttrs} ${attrs}`, i);
        html += '<button type="button" id="outside">outside</button>';
        env = setupDom(html, { holidays });
        const mod = await loadModule(moduleName);
        await settle();
        const Picker = mod[className];
        const wrappers = [...env.document.querySelectorAll('.date-picker-wrapper')];
        return { Picker, wrappers, document: env.document, env };
    }

    test(`${label} (date): auto-initializes every wrapper with one shared overlay`, async (t) => {
        const { Picker, wrappers, document } = await start(t, { count: 2 });
        assert.equal(Picker.instances.length, 2);
        for (const w of wrappers) assert.ok(pickerOf(w), 'picker element is created inside the wrapper');
        assert.equal(document.querySelectorAll('.dp-overlay').length, 1);
    });

    test(`${label} (date): opens on input click and Enter, closes on Escape and outside click`, async (t) => {
        const { wrappers, document } = await start(t);
        const [w] = wrappers;
        const input = w.querySelector('.date-input');

        input.click();
        assert.ok(isOpen(w));
        assert.ok(overlay(document).classList.contains('show'));
        assert.equal(display(w), '2026年1月');
        assert.ok(currentDay(w, 15).classList.contains('today'));

        key(pickerOf(w), 'Escape');
        assert.ok(!isOpen(w));
        assert.ok(!overlay(document).classList.contains('show'));
        assert.equal(document.activeElement, input);

        key(input, 'Enter');
        assert.ok(isOpen(w));
        document.getElementById('outside').click();
        assert.ok(!isOpen(w));
    });

    test(`${label} (date): clicking a day writes YYYY/MM/DD, fires change once and closes`, async (t) => {
        const { wrappers } = await start(t);
        const [w] = wrappers;
        const input = w.querySelector('.date-input');
        const changes = countChanges(input);

        input.click();
        currentDay(w, 20).click();
        assert.equal(input.value, '2026/01/20');
        assert.equal(changes(), 1);
        assert.ok(!isOpen(w));

        input.click();
        const selected = currentDay(w, 20);
        assert.ok(selected.classList.contains('selected'));
        assert.equal(selected.getAttribute('aria-selected'), 'true');
    });

    test(`${label} (date): data-format is applied`, async (t) => {
        const { wrappers } = await start(t, { attrs: 'data-format="YYYY-MM-DD"' });
        const [w] = wrappers;
        const input = w.querySelector('.date-input');
        input.click();
        currentDay(w, 5).click();
        assert.equal(input.value, '2026-01-05');
    });

    test(`${label} (date): min/max dates disable days outside the range, inclusive of both ends`, async (t) => {
        const { wrappers } = await start(t, { attrs: 'data-min-date="2026-01-10" data-max-date="2026-01-20"' });
        const [w] = wrappers;
        w.querySelector('.date-input').click();
        assert.ok(currentDay(w, 9).disabled);
        assert.ok(!currentDay(w, 10).disabled);
        assert.ok(!currentDay(w, 20).disabled);
        assert.ok(currentDay(w, 21).disabled);
        assert.ok(currentDay(w, 9).classList.contains('disabled'));

        currentDay(w, 10).click();
        assert.equal(w.querySelector('.date-input').value, '2026/01/10');
    });

    test(`${label} (date): data-min-date="today" disables days before today`, async (t) => {
        const { wrappers } = await start(t, { attrs: 'data-min-date="today"' });
        const [w] = wrappers;
        w.querySelector('.date-input').click();
        assert.ok(currentDay(w, 14).disabled);
        assert.ok(!currentDay(w, 15).disabled);
    });

    test(`${label} (date): holidays from holiday.csv get the holiday class`, async (t) => {
        const { wrappers, env } = await start(t, { holidays: '2026/1/1,元日\n2026/1/12,成人の日\n' });
        const [w] = wrappers;
        assert.ok(env.requests.some((u) => String(u).endsWith('holiday.csv')), 'holiday.csv is requested');
        w.querySelector('.date-input').click();
        assert.ok(currentDay(w, 1).classList.contains('holiday'));
        assert.ok(currentDay(w, 12).classList.contains('holiday'));
        assert.ok(!currentDay(w, 13).classList.contains('holiday'));
    });

    test(`${label} (date): month navigation across years and February lengths`, async (t) => {
        const { wrappers } = await start(t);
        const [w] = wrappers;
        w.querySelector('.date-input').click();

        next(w);
        assert.equal(display(w), '2026年2月');
        assert.equal(currentDays(w).length, 28);

        prev(w);
        prev(w);
        assert.equal(display(w), '2025年12月');
        assert.equal(currentDays(w).length, 31);
        next(w);
        assert.equal(display(w), '2026年1月');

        for (let i = 0; i < 25; i++) next(w);
        assert.equal(display(w), '2028年2月');
        assert.equal(currentDays(w).length, 29);
    });

    test(`${label} (date): next month from a selected 31st does not skip February`, async (t) => {
        const { wrappers } = await start(t);
        const [w] = wrappers;
        const input = w.querySelector('.date-input');
        input.click();
        currentDay(w, 31).click();
        input.click();
        assert.equal(display(w), '2026年1月');
        next(w);
        assert.equal(display(w), '2026年2月');
    });

    test(`${label} (date): today button selects today and closes`, async (t) => {
        const { wrappers } = await start(t);
        const [w] = wrappers;
        const input = w.querySelector('.date-input');
        input.click();
        next(w);
        pickerOf(w).querySelector('.today-button').click();
        assert.equal(input.value, '2026/01/15');
        assert.ok(!isOpen(w));
    });

    test(`${label} (date): today button is ignored when today is after max date`, async (t) => {
        const { wrappers } = await start(t, { attrs: 'data-max-date="2026-01-10"' });
        const [w] = wrappers;
        const input = w.querySelector('.date-input');
        input.click();
        pickerOf(w).querySelector('.today-button').click();
        assert.equal(input.value, '');
        assert.ok(isOpen(w));
    });

    test(`${label} (date): clear button empties the value and fires change`, async (t) => {
        const { wrappers } = await start(t);
        const [w] = wrappers;
        const input = w.querySelector('.date-input');
        const clear = pickerOf(w).querySelector('.clear-button');

        input.click();
        assert.ok(clear.disabled);
        currentDay(w, 20).click();
        input.click();
        assert.ok(!clear.disabled);

        const changes = countChanges(input);
        clear.click();
        assert.equal(input.value, '');
        assert.equal(changes(), 1);
        assert.ok(!isOpen(w));
        input.click();
        assert.ok(clear.disabled);
        assert.equal(pickerOf(w).querySelectorAll('.calendar-day.selected').length, 0);
    });

    test(`${label} (date): opening another picker closes the first and keeps one overlay`, async (t) => {
        const { wrappers, document } = await start(t, { count: 2 });
        const [a, b] = wrappers;
        a.querySelector('.date-input').click();
        b.querySelector('.date-input').click();
        assert.ok(!isOpen(a));
        assert.ok(isOpen(b));
        assert.ok(overlay(document).classList.contains('show'));

        key(pickerOf(b), 'Escape');
        assert.ok(!isOpen(b));
        assert.ok(!overlay(document).classList.contains('show'));
    });

    test(`${label} (date): destroy removes the picker, the instance and the overlay`, async (t) => {
        const { Picker, wrappers, document } = await start(t);
        const [w] = wrappers;
        const input = w.querySelector('.date-input');
        Picker.instances[0].destroy();

        assert.equal(Picker.instances.length, 0);
        assert.equal(pickerOf(w), null);
        assert.equal(document.querySelectorAll('.dp-overlay').length, 0);
        input.click();
        document.getElementById('outside').click();
        assert.equal(pickerOf(w), null);
    });
}
