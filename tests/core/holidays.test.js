import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHolidayCsv, loadHolidays, resolveBasePath } from '../../core/holidays.js';

test('parseHolidayCsv reads the leading YYYY/M/D of each line (LF or CRLF), skipping other lines', () => {
    const csv = '国民の祝日・休日月日,国民の祝日・休日名称\r\n2026/1/1,元日\r\n\r\n2026/1/12,成人の日\n2026/11/23,勤労感謝の日\n';
    assert.deepEqual([...parseHolidayCsv(csv)], ['2026/1/1', '2026/1/12', '2026/11/23']);
    assert.equal(parseHolidayCsv('').size, 0);
});

test('loadHolidays gives the parsed set, or an empty set on a non-2xx answer or an error', async (t) => {
    const original = globalThis.fetch;
    t.after(() => { globalThis.fetch = original; });

    const asked = [];
    globalThis.fetch = async (url) => { asked.push(url); return { ok: true, status: 200, text: async () => '2026/1/1,元日\n' }; };
    assert.deepEqual([...await loadHolidays('/dist/holiday.csv')], ['2026/1/1']);
    assert.deepEqual(asked, ['/dist/holiday.csv']);

    globalThis.fetch = async () => ({ ok: false, status: 404, text: async () => '' });
    assert.equal((await loadHolidays('x')).size, 0);

    globalThis.fetch = async () => { throw new TypeError('network'); };
    assert.equal((await loadHolidays('x')).size, 0);
});

test('resolveBasePath uses the directory of the current script, or of the last script with src', () => {
    const doc = (current, scripts = []) => ({ currentScript: current, querySelectorAll: () => scripts });
    assert.equal(resolveBasePath(doc({ src: 'http://h/dist/datepicker.js' })), 'http://h/dist/');
    assert.equal(resolveBasePath(doc(null, [{ src: 'http://h/a.js' }, { src: 'http://h/lib/x.js' }])), 'http://h/lib/');
    assert.equal(resolveBasePath(doc(null, [])), '');
});
