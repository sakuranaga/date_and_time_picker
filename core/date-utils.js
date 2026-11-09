/* ----------------------------------------------------------
   core/date-utils.js : pure date helpers shared by the pickers
---------------------------------------------------------- */

/** A new Date at 00:00:00.000 of the same day. */
export function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Reads a minDate / maxDate option: null, 'today', a Date, 'YYYY-M-D' (local time),
 * or any string Date understands. Anything else gives null.
 */
export function parseDateOption(value, now = new Date()) {
    if (!value) return null;
    if (value === 'today') return startOfDay(now);
    if (value instanceof Date) return value;
    // Parse YYYY-MM-DD format explicitly to avoid UTC/local timezone ambiguity
    const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    const parsed = new Date(value);
    return isNaN(parsed) ? null : parsed;
}

/** True when the day of `date` is before the day of `min` or after the day of `max` (both ends are allowed). */
export function isOutOfRange(date, min, max) {
    const d = startOfDay(date);
    if (min && d < startOfDay(min)) return true;
    if (max && d > startOfDay(max)) return true;
    return false;
}

export function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

/** The key used in the holiday set: 'YYYY/M/D'. */
export function holidayKey(date) {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/** Replaces the first YYYY, MM and DD of `format`. */
export function formatDate(date, format) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return format
        .replace('YYYY', y)
        .replace('MM', m)
        .replace('DD', d);
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A regular expression source matching what formatDate(date, format) writes: like formatDate, the first YYYY,
 * MM and DD become groups ((\d+) for the year, which formatDate does not zero-pad; (\d{2}) for month and day)
 * and every other character is literal.
 */
export function datePattern(format) {
    return escapeRegExp(format)
        .replace('YYYY', '(\\d+)')
        .replace('MM', '(\\d{2})')
        .replace('DD', '(\\d{2})');
}

/** The 42 cells (6 weeks from Sunday) shown for a month: [{ date, otherMonth }]. */
export function buildMonthCells(year, month) {
    const cells = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    const startWeekday = firstDay.getDay();

    /* Previous Month Days */
    for (let i = startWeekday - 1; i >= 0; i--) {
        const day = prevLastDay.getDate() - i;
        cells.push({ date: new Date(year, month - 1, day), otherMonth: true });
    }

    /* Current Month Days */
    for (let day = 1; day <= lastDay.getDate(); day++) {
        cells.push({ date: new Date(year, month, day), otherMonth: false });
    }

    /* Next Month Days */
    const filled = startWeekday + lastDay.getDate();
    const remain = 42 - filled;
    for (let day = 1; day <= remain; day++) {
        cells.push({ date: new Date(year, month + 1, day), otherMonth: true });
    }
    return cells;
}

/** A new Date `n` days after `date` (negative goes back), at the same time of day. */
export function addDays(date, n) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n,
        date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

/** The same day of the month `n` months later (negative goes back), clamped to the last day of that month. */
export function addMonthsClamped(date, n) {
    const first = new Date(date.getFullYear(), date.getMonth() + n, 1);
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay));
}

/**
 * Where a calendar navigation key moves from `date`: ← → one day, ↑ ↓ one week, PageUp / PageDown one month
 * (clamped). Returns null for other keys (Home / End depend on the displayed month and are handled by the caller).
 */
export function keyTargetDate(date, key) {
    switch (key) {
        case 'ArrowRight': return addDays(date, 1);
        case 'ArrowLeft': return addDays(date, -1);
        case 'ArrowDown': return addDays(date, 7);
        case 'ArrowUp': return addDays(date, -7);
        case 'PageDown': return addMonthsClamped(date, 1);
        case 'PageUp': return addMonthsClamped(date, -1);
        default: return null;
    }
}
