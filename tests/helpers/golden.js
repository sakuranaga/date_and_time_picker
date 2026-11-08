/* Records what a scripted scenario does to the page, step by step, for comparison with a stored record
   (tests/fixtures/golden/<name>.json). Used to show that a refactoring does not change behaviour (DP-0010).

   Each step records: the normalized DOM of every wrapper (as a sha256, to keep the records small; set GOLDEN_FULL=1
   with UPDATE_GOLDEN=1 to write the full HTML instead when you need to see a difference), input values, the change events fired during the step
   (with the value at the time), open states, the overlay(s), the focused element and the setTimeout delays scheduled.
   The records include today's known bugs on purpose; a fix that changes a recorded behaviour regenerates the record
   (UPDATE_GOLDEN=1) and says why in its review notes. */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { setupDom, loadModule, settle } from './dom.js';
import { NOW } from './picker.js';

const FIXTURE_DIR = new URL('../fixtures/golden/', import.meta.url);

/** Removes whitespace-only text nodes (template indentation; no rendering effect in the pickers' containers). */
function stripWhitespace(node) {
    for (const child of [...node.childNodes]) {
        if (child.nodeType === 3 && child.textContent.trim() === '') child.remove();
        else if (child.nodeType === 1) stripWhitespace(child);
    }
    return node;
}

function normalizedHtml(element) {
    if (!element) return null;
    return stripWhitespace(element.cloneNode(true)).outerHTML
        .replace(/time-picker-[a-z0-9]+/g, 'time-picker-ID'); // TimePicker ids come from Math.random
}

function domDigest(html) {
    if (html === null) return null;
    return process.env.GOLDEN_FULL === '1' ? html : createHash('sha256').update(html).digest('hex');
}

function describeFocus(document) {
    const el = document.activeElement;
    if (!el || el === document.body) return 'body';
    const cls = el.getAttribute('class') ? `.${el.getAttribute('class').trim().split(/\s+/).join('.')}` : '';
    const text = el.tagName === 'INPUT' ? `#${el.id || ''}` : `|${el.textContent.trim().slice(0, 12)}`;
    return `${el.tagName.toLowerCase()}${cls}${text}`;
}

/**
 * Runs a scenario and returns its record.
 * @param {import('node:test').TestContext} t
 * @param {{ module: string, className: string, html: string, holidays?: string,
 *           roots: string, steps: Array<[string, (ctx) => void]> }} scenario
 *   roots: selector of the elements whose DOM is recorded (the wrappers)
 */
export async function recordScenario(t, scenario) {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
    const env = setupDom(scenario.html + '<button type="button" id="outside">outside</button>',
        { holidays: scenario.holidays ?? null });
    const timeouts = [];
    const mockedSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (fn, ms, ...args) => { timeouts.push(ms); return mockedSetTimeout(fn, ms, ...args); };

    try {
        const mod = await loadModule(scenario.module);
        await settle();
        const Picker = mod[scenario.className];
        const { document } = env;
        const roots = () => [...document.querySelectorAll(scenario.roots)];
        const inputs = () => roots().map((r) => (r.matches('input') ? r : r.querySelector('input')));

        let changes = [];
        inputs().forEach((input, index) => {
            input.addEventListener('change', () => changes.push(`${index}=${input.value}`));
        });

        const ctx = {
            Picker, mod, document, window: env.window,
            root: (i) => roots()[i],
            input: (i) => inputs()[i],
        };

        const snapshot = (label) => ({
            step: label,
            values: inputs().map((i) => i.value),
            changes,
            open: roots().map((r) => Boolean(r.querySelector('.date-picker.show, .tp-popup.show'))),
            overlays: [...document.querySelectorAll('.dp-overlay, .tp-overlay')].map((o) => o.outerHTML),
            focus: describeFocus(document),
            timeouts: timeouts.splice(0),
            instances: Picker.instances.length,
            dom: roots().map((r) => domDigest(normalizedHtml(r))),
        });

        const record = [snapshot('init')];
        for (const [label, run] of scenario.steps) {
            changes = [];
            run(ctx);
            record.push(snapshot(label));
        }
        return record;
    } finally {
        globalThis.setTimeout = mockedSetTimeout;
        env.cleanup();
    }
}

/** Compares with the stored record, or (re)writes it when UPDATE_GOLDEN=1. */
export function expectGolden(name, record, assert) {
    const file = new URL(`${name}.json`, FIXTURE_DIR);
    const text = `${JSON.stringify(record, null, 2)}\n`;
    if (process.env.UPDATE_GOLDEN === '1') {
        mkdirSync(FIXTURE_DIR, { recursive: true });
        writeFileSync(file, text);
        return;
    }
    const expected = JSON.parse(readFileSync(file, 'utf8'));
    assert.deepEqual(record, expected);
}
