/* The built IIFE bundles (dist/*.js) evaluated as <script src> in jsdom: globals, `extend`, the holiday.csv URL
   and both auto-initialization timings. Uses the committed/built dist, so build before running the tests. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole, requestInterceptor } from 'jsdom';

const ROOT = new URL('../', import.meta.url);
const BUNDLES = {
    datepicker: { global: 'DatePicker', html: '<div class="date-picker-wrapper"><input class="date-input"></div>' },
    datetimepicker: { global: 'DateTimePicker', html: '<div class="date-picker-wrapper" data-mode="datetime"><input class="date-input"></div>' },
    timepicker: { global: 'TimePicker', html: '<div class="tp-wrapper"><input class="tp-input" id="t"></div>' },
};

/** Serves any http://localhost/**\/<bundle>.js from dist/; everything else is 404 (never the network). */
function serveDist() {
    return requestInterceptor(async (request) => {
        const name = new URL(request.url).pathname.match(/([a-z]+)\.js$/)?.[1];
        if (name && BUNDLES[name]) {
            const body = await readFile(new URL(`dist/${name}.js`, ROOT));
            return new Response(body, { headers: { 'Content-Type': 'application/javascript' } });
        }
        return new Response('not found', { status: 404 });
    });
}

async function loadPage(html) {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (e) => errors.push(e));
    const csvRequests = [];
    const dom = new JSDOM(`<!DOCTYPE html><html>${html}</html>`, {
        url: 'http://localhost/demo/page.html',
        runScripts: 'dangerously',
        resources: { interceptors: [serveDist()] },
        virtualConsole,
        beforeParse(window) {
            window.fetch = async (url) => { csvRequests.push(String(url)); return { ok: false, status: 404, text: async () => '' }; };
        },
    });
    await new Promise((resolve) => dom.window.addEventListener('load', resolve));
    await settle();
    return {
        window: dom.window,
        csvRequests,
        close() {
            dom.window.close();
            if (errors.length) throw new Error(errors.map((e) => e.cause?.stack || e.message).join('\n'));
        },
    };
}

async function settle() {
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
}

for (const [name, { global, html }] of Object.entries(BUNDLES)) {
    test(`dist/${name}.js: defines window.${global} with only the ${global} class and initializes the page`, async () => {
        const page = await loadPage(`<body>${html}<script src="/dist/${name}.js"></script></body>`);
        try {
            const ns = page.window[global];
            assert.deepEqual(Object.keys(ns), [global]);
            assert.equal(typeof ns[global], 'function');
            assert.equal(ns[global].instances.length, 1);
        } finally {
            page.close();
        }
    });

    test(`dist/${name}.js: keeps existing properties of window.${global} (extend)`, async () => {
        const page = await loadPage(`<body>${html}<script>window.${global} = { other: 1 };</script>`
            + `<script src="/dist/${name}.js"></script></body>`);
        try {
            assert.equal(page.window[global].other, 1);
            assert.equal(typeof page.window[global][global], 'function');
        } finally {
            page.close();
        }
    });

    test(`dist/${name}.js: in <head> (before the body is parsed) it still initializes the page`, async () => {
        const page = await loadPage(`<head><script src="/dist/${name}.js"></script></head><body>${html}</body>`);
        try {
            assert.equal(page.window[global][global].instances.length, 1);
        } finally {
            page.close();
        }
    });

    test(`dist/${name}.js: inserted after the page has loaded, it initializes immediately`, async () => {
        const page = await loadPage(`<body>${html}</body>`);
        try {
            assert.equal(page.window.document.readyState, 'complete');
            const script = page.window.document.createElement('script');
            const loaded = new Promise((resolve) => script.addEventListener('load', resolve));
            script.src = `/lib/sub/${name}.js`;
            page.window.document.body.appendChild(script);
            await loaded;
            await settle();
            assert.equal(page.window[global][global].instances.length, 1);
        } finally {
            page.close();
        }
    });
}

for (const name of ['datepicker', 'datetimepicker']) {
    test(`dist/${name}.js: holiday.csv is fetched next to the script`, async () => {
        const page = await loadPage(`<body>${BUNDLES[name].html}<script src="/dist/${name}.js"></script></body>`);
        try {
            assert.deepEqual(page.csvRequests, ['http://localhost/dist/holiday.csv']);
        } finally {
            page.close();
        }

        const late = await loadPage(`<body>${BUNDLES[name].html}</body>`);
        try {
            const script = late.window.document.createElement('script');
            const loaded = new Promise((resolve) => script.addEventListener('load', resolve));
            script.src = `/lib/sub/${name}.js`;
            late.window.document.body.appendChild(script);
            await loaded;
            await settle();
            assert.deepEqual(late.csvRequests, ['http://localhost/lib/sub/holiday.csv']);
        } finally {
            late.close();
        }
    });
}
