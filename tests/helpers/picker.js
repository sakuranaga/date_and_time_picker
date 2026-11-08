/* Small DOM helpers for the picker tests (test code, no picker logic). */

// Thursday 2026-01-15 10:00 local time (TZ is fixed to Asia/Tokyo in compose.yaml; local construction keeps it TZ-safe)
export const NOW = new Date(2026, 0, 15, 10, 0, 0);

export function wrapperHtml(attrs = '', index = 0) {
    return `<div class="date-picker-wrapper" id="w${index}" ${attrs}>`
        + '<input type="text" class="date-input" readonly></div>';
}

export const pickerOf = (wrapper) => wrapper.querySelector('.date-picker');
export const isOpen = (wrapper) => Boolean(pickerOf(wrapper)?.classList.contains('show'));
export const overlay = (document) => document.querySelector('.dp-overlay');
export const display = (wrapper) => pickerOf(wrapper).querySelector('.month-year-display').textContent;

/** Day buttons of the displayed month (not the leading / trailing days of other months). */
export const currentDays = (wrapper) => [...pickerOf(wrapper).querySelectorAll('.calendar-day:not(.other-month)')];

export function currentDay(wrapper, day) {
    const found = currentDays(wrapper).find((b) => b.textContent === String(day));
    if (!found) throw new Error(`day ${day} is not in the displayed month`);
    return found;
}

export const next = (wrapper) => pickerOf(wrapper).querySelector('.next-month').click();
export const prev = (wrapper) => pickerOf(wrapper).querySelector('.prev-month').click();

export function key(target, keyName, init = {}) {
    const { KeyboardEvent } = target.ownerDocument.defaultView;
    const event = new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
}

/** Counts change events on an element from now on; returns a function giving the count. */
export function countChanges(element) {
    let n = 0;
    element.addEventListener('change', () => { n += 1; });
    return () => n;
}

export const timeItem = (root, kind, value) => root.querySelector(`.${kind}[data-value="${value}"]`);
export const selectedValue = (root, kind) => root.querySelector(`.${kind}.selected`)?.dataset.value ?? null;
