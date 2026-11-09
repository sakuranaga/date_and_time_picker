/* DP-0005: minuteStep must be a positive integer that divides 60; anything else falls back to 30.
   An invalid step used to loop forever (e.g. -15 or 0), which would hang the test process itself, so every case
   that could loop runs in a child process with a timeout: a hang becomes a failure instead of a stuck run. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('../', import.meta.url);
const url = (path) => new URL(path, ROOT).href;

/** Runs an ES module snippet in a child node (CSS stub registered) and returns the JSON it prints last. */
function probe(code) {
    const result = spawnSync(process.execPath,
        ['--import', url('tests/helpers/register-css.js'), '--input-type=module', '-e', code],
        { cwd: new URL('.', ROOT), timeout: 10000, encoding: 'utf8' });
    assert.equal(result.signal, null, `finished in time (did not hang): ${result.stderr}`);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout.trim().split('\n').pop());
}

const INVALID = [0, -15, 7, 25, 120, 1.5, NaN, '15', null];

test('normalizeMinuteStep keeps positive divisors of 60 and replaces anything else with 30', () => {
    const out = probe(`
        import { normalizeMinuteStep } from '${url('core/time-utils.js')}';
        const valid = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60].map(normalizeMinuteStep);
        const invalid = ${JSON.stringify(INVALID)}.map(normalizeMinuteStep);
        console.log(JSON.stringify({ valid, invalid, undef: normalizeMinuteStep(undefined) }));`);
    assert.deepEqual(out.valid, [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60]);
    assert.deepEqual(out.invalid, INVALID.map(() => 30));
    assert.equal(out.undef, 30);
});

test('minuteValues and nearestTime use 30 for an invalid step instead of looping', () => {
    const out = probe(`
        import { minuteValues, nearestTime } from '${url('core/time-utils.js')}';
        const steps = [0, -15, 7, NaN];
        console.log(JSON.stringify({
            values: steps.map(minuteValues),
            nearest: steps.map((s) => nearestTime(new Date(2026, 0, 15, 10, 20), s)),
        }));`);
    for (const v of out.values) assert.deepEqual(v, ['00', '30']);
    for (const n of out.nearest) assert.deepEqual(n, { hour: '10', minute: '30' });
});

/** Builds a page, loads a picker module and reports the minute items and the stored minuteStep. */
function probePage(moduleName, html, construct = '') {
    return probe(`
        import { setupDom, loadModule, settle } from '${url('tests/helpers/dom.js')}';
        const env = setupDom(${JSON.stringify(html)});
        const mod = await loadModule('${moduleName}');
        await settle();
        ${construct}
        const Picker = Object.values(mod)[0];
        const report = Picker.instances.map((p) => ({
            step: p.config.minuteStep,
            minutes: [...(p.picker || p.popup).querySelectorAll('[class*="minute-item"]')].map((i) => i.dataset.value),
        }));
        env.cleanup();
        console.log(JSON.stringify(report));`);
}

test('DateTimePicker: an invalid data-minute-step falls back to 30', () => {
    const html = ['-15', '0', '7', 'abc', '15', '1.5', '15abc', ' 20 '].map((s) =>
        `<div class="date-picker-wrapper" data-mode="time" data-minute-step="${s}"><input class="date-input"></div>`).join('');
    const report = probePage('datetimepicker', html);
    // the whole attribute must be a number: '1.5' and '15abc' are not read as 1 and 15
    assert.deepEqual(report.map((r) => r.step), [30, 30, 30, 30, 15, 30, 30, 20]);
    assert.deepEqual(report[0].minutes, ['00', '30']);
    assert.deepEqual(report[4].minutes, ['00', '15', '30', '45']);
});

test('DateTimePicker: an invalid minuteStep option falls back to 30', () => {
    const report = probePage('datetimepicker', '<div id="w"><input class="date-input"></div>',
        "new mod.DateTimePicker(env.document.getElementById('w'), { mode: 'datetime', minuteStep: 0 });");
    assert.deepEqual(report, [{ step: 30, minutes: ['00', '30'] }]);
});

test('TimePicker: an invalid data-minute-step or minuteStep option falls back to 30', () => {
    const html = ['-15', '7', '20', '1.5', '15abc'].map((s) =>
        `<div class="tp-wrapper"><input class="tp-input" data-minute-step="${s}"></div>`).join('')
        + '<div class="tp-wrapper"><input id="manual"></div>';
    const report = probePage('timepicker', html,
        "new mod.TimePicker(env.document.getElementById('manual'), { minuteStep: -5 });");
    assert.deepEqual(report.map((r) => r.step), [30, 30, 20, 30, 30, 30]);
    assert.deepEqual(report[0].minutes, ['00', '30']);
    assert.deepEqual(report[2].minutes, ['00', '20', '40']);
});

test('parseMinuteStepAttribute reads the whole attribute as a number', () => {
    const out = probe(`
        import { parseMinuteStepAttribute } from '${url('core/time-utils.js')}';
        console.log(JSON.stringify(['15', ' 15 ', '1.5', '15abc', '', '  ', 'abc', '-15', '60'].map(parseMinuteStepAttribute)
            .concat(parseMinuteStepAttribute(undefined))));`);
    assert.deepEqual(out, [15, 15, 30, 30, 30, 30, 30, 30, 60, 30]);
});
