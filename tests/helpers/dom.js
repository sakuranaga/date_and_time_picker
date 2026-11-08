/* jsdom environment for the picker tests.
   The picker modules use browser globals (document, Event, ...) and auto-initialize when imported,
   so each test builds a fresh DOM and imports a fresh copy of the module. */

import { JSDOM, VirtualConsole } from 'jsdom';

const DOM_GLOBALS = ['document', 'Event', 'KeyboardEvent', 'MouseEvent', 'HTMLElement', 'Node'];
let moduleSeq = 0;

/**
 * Builds a jsdom document with `html` in its body and installs its globals.
 * @param {string} html
 * @param {{ url?: string, holidays?: string | null }} [options]
 *   holidays: the text served for holiday.csv; null answers 404 (the pickers then use no holidays).
 * @returns {{ window, document, errors: Error[], requests: string[], cleanup: () => void }}
 */
export function setupDom(html, { url = 'http://localhost/demo/test.html', holidays = null } = {}) {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    // jsdom reports exceptions thrown in event handlers here instead of rethrowing them
    virtualConsole.on('jsdomError', (error) => errors.push(error));

    const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`, { url, virtualConsole });
    const { window } = dom;
    const requests = [];

    const saved = new Map();
    const install = (name, value) => {
        saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    };
    install('window', window);
    for (const name of DOM_GLOBALS) install(name, window[name]);
    install('fetch', async (resource) => {
        requests.push(String(resource));
        if (holidays === null) return { ok: false, status: 404, text: async () => '' };
        return { ok: true, status: 200, text: async () => holidays };
    });

    let cleaned = false;
    return {
        window,
        document: window.document,
        errors,
        requests,
        cleanup() {
            if (cleaned) return;
            cleaned = true;
            for (const [name, descriptor] of saved) {
                if (descriptor) Object.defineProperty(globalThis, name, descriptor);
                else delete globalThis[name];
            }
            window.close();
            if (errors.length > 0) {
                const detail = errors.map((e) => e.cause?.stack || e.stack || e.message).join('\n');
                throw new Error(`jsdom reported ${errors.length} error(s):\n${detail}`);
            }
        },
    };
}

/**
 * Imports `<name>.js` from the repository root as a new module instance
 * (a fresh static `instances` and a fresh auto-initialization against the current document).
 */
export function loadModule(name) {
    moduleSeq += 1;
    return import(new URL(`../../${name}.js?case=${moduleSeq}`, import.meta.url).href);
}

/** Lets the auto-initialization finish (the holiday.csv fetch and its promise chain). */
export async function settle() {
    // setImmediate is not faked by the mock timers used in the tests (only Date and setTimeout are)
    for (let i = 0; i < 3; i++) await new Promise((resolve) => setImmediate(resolve));
}
