/* ----------------------------------------------------------
   core/time-columns.js : the hour / minute columns shared by TimePicker and the DateTimePicker time modes
---------------------------------------------------------- */

import { HOURS, minuteValues } from './time-utils.js';

/**
 * Fills and drives an hour column and a minute column. The columns' outer markup belongs to the caller;
 * the class names of the items are given so that each picker keeps its own (tp-* or dp-*).
 */
export class TimeColumns {
    /**
     * @param {HTMLElement} hourColumn
     * @param {HTMLElement} minuteColumn
     * @param {{ item: string, hourItem: string, minuteItem: string }} classes
     * @param {number} step  minute step
     */
    constructor(hourColumn, minuteColumn, classes, step) {
        this.hourColumn = hourColumn;
        this.minuteColumn = minuteColumn;
        this.classes = classes;
        this.step = step;
    }

    /** Writes the hour (00-23) and minute (by step) items. `step` replaces the minute step when given. */
    render(step = this.step) {
        this.step = step;
        const { item, hourItem, minuteItem } = this.classes;
        let hourHTML = '';
        for (const hour of HOURS) {
            hourHTML += `<div class="${item} ${hourItem}" data-value="${hour}" role="option" tabindex="-1">${hour}</div>`;
        }
        this.hourColumn.innerHTML = hourHTML;

        let minuteHTML = '';
        for (const minute of minuteValues(this.step)) {
            minuteHTML += `<div class="${item} ${minuteItem}" data-value="${minute}" role="option" tabindex="-1">${minute}</div>`;
        }
        this.minuteColumn.innerHTML = minuteHTML;
        this._updateTabStops();
    }

    /** Marks the item with `value` as selected in the 'hour' or 'minute' column (and unmarks the others). */
    select(kind, value) {
        this._items(kind).forEach(item => {
            const isSelected = item.dataset.value === value;
            item.classList.toggle('selected', isSelected);
            item.setAttribute('aria-selected', isSelected);
        });
        this._updateTabStops();
    }

    /** Unmarks every item of both columns. */
    clearSelection() {
        for (const kind of ['hour', 'minute']) {
            this._items(kind).forEach(item => {
                item.classList.remove('selected');
                item.setAttribute('aria-selected', false);
            });
        }
        this._updateTabStops();
    }

    /* Roving tabindex: in each column only the selected item (or the first one) can be reached with Tab */
    _updateTabStops() {
        for (const kind of ['hour', 'minute']) {
            const items = [...this._items(kind)];
            const stop = items.find(item => item.classList.contains('selected')) || items[0];
            items.forEach(item => item.setAttribute('tabindex', item === stop ? '0' : '-1'));
        }
    }

    /** Focuses the item with `value` in the column (or the column's tabbable item) and scrolls it into view. */
    focusItem(kind, value) {
        const items = [...this._items(kind)];
        const item = value === undefined
            ? items.find(i => i.getAttribute('tabindex') === '0')
            : items.find(i => i.dataset.value === value);
        if (!item) return;
        item.focus({ preventScroll: true });
        TimeColumns.scrollToItem(kind === 'hour' ? this.hourColumn : this.minuteColumn, item.dataset.value);
    }

    /**
     * Where a key moves from the item `value` of column `kind`: ↑ ↓ Home End within the column (staying at the ends),
     * → from the hour column / ← from the minute column to the other column's tabbable item. null for other keys.
     * @returns {{ kind: 'hour' | 'minute', value: string } | null}
     */
    keyTarget(kind, value, key) {
        const values = [...this._items(kind)].map(item => item.dataset.value);
        const index = values.indexOf(value);
        switch (key) {
            case 'ArrowDown': return { kind, value: values[Math.min(index + 1, values.length - 1)] };
            case 'ArrowUp': return { kind, value: values[Math.max(index - 1, 0)] };
            case 'Home': return { kind, value: values[0] };
            case 'End': return { kind, value: values[values.length - 1] };
            case 'ArrowRight':
            case 'ArrowLeft': {
                const other = kind === 'hour' ? 'minute' : 'hour';
                if ((key === 'ArrowRight') !== (kind === 'hour')) return null;
                const stop = [...this._items(other)].find(item => item.getAttribute('tabindex') === '0');
                return stop ? { kind: other, value: stop.dataset.value } : null;
            }
            default: return null;
        }
    }

    /**
     * Handles a navigation key on an item: moving within a column selects the item at once through `select(kind, value)`
     * (like a click), moving to the other column only moves the focus. Returns true when the key was handled.
     */
    handleKeydown(e, select) {
        const kind = this.itemValue(e.target, 'hour') !== null ? 'hour'
            : this.itemValue(e.target, 'minute') !== null ? 'minute' : null;
        if (!kind) return false;
        const current = e.target.dataset.value;
        const target = this.keyTarget(kind, current, e.key);
        if (!target) return false;
        e.preventDefault();
        if (target.kind === kind && target.value !== current) select(kind, target.value);
        this.focusItem(target.kind, target.value);
        return true;
    }

    /** The value of a clicked element when it is an item of the given kind, else null. */
    itemValue(target, kind) {
        const cls = kind === 'hour' ? this.classes.hourItem : this.classes.minuteItem;
        return target.classList.contains(cls) ? target.dataset.value : null;
    }

    /** Scrolls a column so that its selected item is centered. */
    static scrollToSelection(container) {
        const selected = container.querySelector('.selected');
        if (selected) {
            container.scrollTop = selected.offsetTop - container.offsetTop
                - (container.clientHeight / 2) + (selected.clientHeight / 2);
        }
    }

    /** Scrolls a column so that the item with `value` is centered. */
    static scrollToItem(container, value) {
        const item = container.querySelector(`[data-value="${value}"]`);
        if (item) {
            container.scrollTop = item.offsetTop - container.offsetTop
                - (container.clientHeight / 2) + (item.clientHeight / 2);
        }
    }

    _items(kind) {
        const column = kind === 'hour' ? this.hourColumn : this.minuteColumn;
        const cls = kind === 'hour' ? this.classes.hourItem : this.classes.minuteItem;
        return column.querySelectorAll(`.${cls}`);
    }
}
