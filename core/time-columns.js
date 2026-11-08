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
    }

    /** Marks the item with `value` as selected in the 'hour' or 'minute' column (and unmarks the others). */
    select(kind, value) {
        this._items(kind).forEach(item => {
            const isSelected = item.dataset.value === value;
            item.classList.toggle('selected', isSelected);
            item.setAttribute('aria-selected', isSelected);
        });
    }

    /** Unmarks every item of both columns. */
    clearSelection() {
        for (const kind of ['hour', 'minute']) {
            this._items(kind).forEach(item => {
                item.classList.remove('selected');
                item.setAttribute('aria-selected', false);
            });
        }
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
