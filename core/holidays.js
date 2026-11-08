/* ----------------------------------------------------------
   core/holidays.js : holiday.csv loading shared by the calendar pickers
---------------------------------------------------------- */

/** Parses holiday CSV text into a Set of "YYYY/M/D" strings (the leading date of each line). */
export function parseHolidayCsv(text) {
    const holidays = new Set();
    const datePattern = /^(\d{4}\/\d{1,2}\/\d{1,2})/;
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const m = line.match(datePattern);
        if (m) holidays.add(m[1]);
    }
    return holidays;
}

/**
 * The directory URL of the running script (with a trailing '/'), from document.currentScript
 * or else the last script with a src. Call it synchronously while the script is being evaluated.
 */
export function resolveBasePath(doc) {
    const currentScript = doc.currentScript
        || (() => {
            const scripts = doc.querySelectorAll('script[src]');
            return scripts[scripts.length - 1];
        })();
    if (currentScript && currentScript.src) {
        return currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);
    }
    return '';
}

/** Fetches and parses the holiday CSV; any failure (network, non-2xx) gives an empty Set. */
export function loadHolidays(url) {
    return fetch(url)
        .then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.text();
        })
        .then(text => parseHolidayCsv(text))
        .catch(() => new Set());
}
