/* Behaviour records of today's pickers (DP-0010 refactoring guard). See tests/helpers/golden.js.
   Regenerate (only when a change of behaviour is intended, and say why in the review notes):
     docker compose run --rm -e UPDATE_GOLDEN=1 dev node --import ./tests/helpers/register-css.js --test tests/golden.test.js */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordScenario, expectGolden } from './helpers/golden.js';
import { wrapperHtml, pickerOf, currentDay, next, prev, key, timeItem } from './helpers/picker.js';

const HOLIDAYS = '2026/1/1,元日\n2026/1/12,成人の日\n';

const click = (el) => el.click();
const dp = (ctx, i) => pickerOf(ctx.root(i));
const btn = (ctx, i, cls) => dp(ctx, i).querySelector(cls);

/* Steps for the calendar (DatePicker and DateTimePicker date mode); wrapper 0 is plain, 1 has min/max */
const calendarSteps = [
    ['open 0', (c) => click(c.input(0))],
    ['pick 20', (c) => click(currentDay(c.root(0), 20))],
    ['reopen 0', (c) => click(c.input(0))],
    ['next month', (c) => next(c.root(0))],
    ['prev month x2', (c) => { prev(c.root(0)); prev(c.root(0)); }],
    ['today button', (c) => click(btn(c, 0, '.today-button'))],
    ['enter on input 0', (c) => key(c.input(0), 'Enter')],
    ['arrow right', (c) => key(c.document.activeElement, 'ArrowRight')],
    ['arrow down', (c) => key(c.document.activeElement, 'ArrowDown')],
    ['page down', (c) => key(c.document.activeElement, 'PageDown')],
    ['end key', (c) => key(c.document.activeElement, 'End')],
    ['enter on day', (c) => key(c.document.activeElement, 'Enter')],
    ['open 1 (min/max)', (c) => click(c.input(1))],
    ['open 0 closes 1', (c) => click(c.input(0))],
    ['escape', (c) => key(dp(c, 0), 'Escape')],
    ['open 1 again', (c) => click(c.input(1))],
    ['today out of range', (c) => click(btn(c, 1, '.today-button'))],
    ['pick 10 on 1', (c) => click(currentDay(c.root(1), 10))],
    ['open 0 and clear', (c) => { click(c.input(0)); click(btn(c, 0, '.clear-button')); }],
    ['open 0, outside click', (c) => { click(c.input(0)); click(c.document.getElementById('outside')); }],
    ['destroy 0', (c) => c.Picker.instances[0].destroy()],
    ['destroy 1', (c) => c.Picker.instances[0].destroy()],
];

const twoCalendars = (mode) => wrapperHtml(mode, 0)
    + wrapperHtml(`${mode} data-min-date="2026-01-10" data-max-date="2026-01-14" data-format="YYYY-MM-DD"`, 1);

test('golden: DatePicker', async (t) => {
    const record = await recordScenario(t, {
        module: 'datepicker', className: 'DatePicker', roots: '.date-picker-wrapper',
        html: twoCalendars(''), holidays: HOLIDAYS, steps: calendarSteps,
    });
    expectGolden('datepicker', record, assert);
});

test('golden: DateTimePicker date mode', async (t) => {
    const record = await recordScenario(t, {
        module: 'datetimepicker', className: 'DateTimePicker', roots: '.date-picker-wrapper',
        html: twoCalendars('data-mode="date"'), holidays: HOLIDAYS, steps: calendarSteps,
    });
    expectGolden('datetimepicker-date', record, assert);
});

const valueSteps = (closeStep) => ['08:30', '8:5', '08:30:00', 'abc', ''].flatMap((v) => [
    [`open with "${v}"`, (c) => { c.input(0).value = v; click(c.input(0)); }],
    [`close after "${v}"`, closeStep],
]);

test('golden: DateTimePicker time mode', async (t) => {
    const item = (c, kind, v) => timeItem(dp(c, 0), kind, v);
    const record = await recordScenario(t, {
        module: 'datetimepicker', className: 'DateTimePicker', roots: '.date-picker-wrapper',
        html: wrapperHtml('data-mode="time" data-minute-step="15"', 0) + wrapperHtml('data-mode="time"', 1),
        steps: [
            ['open 0', (c) => click(c.input(0))],
            ['hour 13', (c) => click(item(c, 'dp-hour-item', '13'))],
            ['minute 45', (c) => click(item(c, 'dp-minute-item', '45'))],
            ['enter on input', (c) => key(c.input(0), 'Enter')],
            ['escape on picker', (c) => key(dp(c, 0), 'Escape')],
            ...valueSteps((c) => key(dp(c, 0), 'Escape')),
            ['open 0', (c) => click(c.input(0))],
            ['open 1 closes 0', (c) => click(c.input(1))],
            ['outside click', (c) => click(c.document.getElementById('outside'))],
            ['escape on input (closed)', (c) => key(c.input(1), 'Escape')],
            ['destroy all', (c) => { for (const p of [...c.Picker.instances]) p.destroy(); }],
        ],
    });
    expectGolden('datetimepicker-time', record, assert);
});

test('golden: DateTimePicker datetime mode', async (t) => {
    const item = (c, kind, v) => timeItem(dp(c, 0), kind, v);
    const record = await recordScenario(t, {
        module: 'datetimepicker', className: 'DateTimePicker', roots: '.date-picker-wrapper',
        html: wrapperHtml('data-mode="datetime" data-minute-step="15" data-min-date="2026-01-05"', 0),
        holidays: HOLIDAYS,
        steps: [
            ['hour before date', (c) => { click(c.input(0)); click(item(c, 'dp-hour-item', '09')); }],
            ['pick 20', (c) => click(currentDay(c.root(0), 20))],
            ['hour 14', (c) => click(item(c, 'dp-hour-item', '14'))],
            ['minute 45', (c) => click(item(c, 'dp-minute-item', '45'))],
            ['next month', (c) => next(c.root(0))],
            ['today button', (c) => click(btn(c, 0, '.today-button'))],
            ['escape', (c) => key(dp(c, 0), 'Escape')],
            ['reopen', (c) => click(c.input(0))],
            ['arrow left', (c) => key(c.document.activeElement, 'ArrowLeft')],
            ['enter on day', (c) => key(c.document.activeElement, 'Enter')],
            ['clear', (c) => click(btn(c, 0, '.clear-button'))],
            ...['2026/01/07 08:30', '2026/01/07 8:5', '2026/01/07 08:30:00', '2026/01/07', 'abc', ''].flatMap((v) => [
                [`open with "${v}"`, (c) => { c.input(0).value = v; click(c.input(0)); }],
                [`close after "${v}"`, (c) => key(dp(c, 0), 'Escape')],
            ]),
            ['open, outside click', (c) => { click(c.input(0)); click(c.document.getElementById('outside')); }],
            ['destroy', (c) => c.Picker.instances[0].destroy()],
        ],
    });
    expectGolden('datetimepicker-datetime', record, assert);
});

test('golden: TimePicker', async (t) => {
    const popup = (c, i) => c.input(i).parentElement.querySelector('.tp-popup');
    const item = (c, kind, v) => timeItem(popup(c, 0), kind, v);
    const record = await recordScenario(t, {
        module: 'timepicker', className: 'TimePicker', roots: '.tp-wrapper',
        html: '<div class="tp-wrapper"><input type="text" id="t0" class="tp-input" data-minute-step="15"></div>'
            + '<div class="tp-wrapper"><input type="text" id="t1" class="tp-input"></div>',
        steps: [
            ['click 0', (c) => click(c.input(0))],
            ['hour 13', (c) => click(item(c, 'tp-hour-item', '13'))],
            ['minute 45', (c) => click(item(c, 'tp-minute-item', '45'))],
            ['click inside popup', (c) => click(popup(c, 0))],
            ['overlay click', (c) => click(c.document.getElementById('tp-global-overlay'))],
            ['focus 0', (c) => c.input(0).focus()],
            ['escape', (c) => key(c.input(0), 'Escape')],
            ['arrow down opens', (c) => key(c.input(0), 'ArrowDown')],
            ['tab closes', (c) => key(c.input(0), 'Tab')],
            ...['08:30', '8:5', '08:30:00', 'abc', ''].flatMap((v) => [
                [`open with "${v}"`, (c) => { c.input(0).value = v; click(c.input(0)); }],
                [`overlay after "${v}"`, (c) => click(c.document.getElementById('tp-global-overlay'))],
            ]),
            ['click 0 then 1', (c) => { click(c.input(0)); click(c.input(1)); }],
            ['outside click', (c) => click(c.document.getElementById('outside'))],
            ['setValue 09:00', (c) => { c.Picker.instances[0].setValue('09:00'); c.input(1).value = c.Picker.instances[0].getValue(); }],
            ['setValue invalid', (c) => c.Picker.instances[0].setValue('9:00')],
            ['destroy 0', (c) => c.Picker.instances[0].destroy()],
        ],
    });
    expectGolden('timepicker', record, assert);
});
