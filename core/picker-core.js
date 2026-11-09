/* ----------------------------------------------------------
   core/picker-core.js : the picker shared by DatePicker and DateTimePicker
   mode: 'date' | 'time' | 'datetime'
---------------------------------------------------------- */

import {
    parseDateOption, isOutOfRange, isSameDay, holidayKey, formatDate, buildMonthCells, keyTargetDate,
    parseFormattedDate, isReadableFormat, makeDate,
} from './date-utils.js';
import { nearestTime, matchTimeValue, matchDateTimeTime, normalizeMinuteStep } from './time-utils.js';
import { TimeColumns } from './time-columns.js';

const TIME_CLASSES = { item: 'dp-time-item', hourItem: 'dp-hour-item', minuteItem: 'dp-minute-item' };

/**
 * The live pickers of a wrapper (a Set under this key on the element). Symbol.for is shared by every bundle on the page
 * (datepicker.js and datetimepicker.js each carry their own copy of this module), so neither auto-initializes a wrapper
 * that already has a picker of the other.
 */
export const PICKER_KEY = Symbol.for('date-and-time-picker:picker');

/** True when the wrapper has a live picker (of any bundle). */
export function hasPicker(wrapper) {
    return Boolean(wrapper[PICKER_KEY]?.size);
}

export class PickerCore {
    /**
     * @param {HTMLElement} wrapper  element holding the .date-input
     * @param {object} options
     * @param {{ registry: { instances: PickerCore[] }, ariaLabel: string }} identity
     *   registry: the public class whose static `instances` this picker joins. It is fixed to the public class
     *   (not this.constructor) so that a user's subclass with its own static `instances` still registers there.
     */
    constructor(wrapper, options, { registry, ariaLabel }) {
        this.wrapper = wrapper;
        this.input = wrapper.querySelector('.date-input');
        this._registry = registry;
        (wrapper[PICKER_KEY] ||= new Set()).add(this);
        this._ariaLabel = ariaLabel;

        // Configuration
        this.config = {
            format: 'YYYY/MM/DD',
            mode: 'date',        // 'date' | 'time' | 'datetime'
            minuteStep: 30,
            minDate: null,
            maxDate: null,
            ...options
        };
        // an invalid step (0, negative, not a divisor of 60...) falls back to 30
        this.config.minuteStep = normalizeMinuteStep(this.config.minuteStep);

        // Parse minDate/maxDate
        this.minDate = this.parseDate(this.config.minDate);
        this.maxDate = this.parseDate(this.config.maxDate);

        // Holidays (Set of "YYYY/M/D" strings)
        this.holidays = options.holidays instanceof Set
            ? options.holidays
            : new Set(options.holidays || []);

        this.selectedDate = null;
        this.viewDate = new Date();
        this._dayDates = new WeakMap(); // filled by updateCalendar()
        this.selectedHour = null;
        this.selectedMinute = null;

        this._registry.instances.push(this);
        this.init();
    }

    /* Parse date option */
    parseDate(value) {
        return parseDateOption(value);
    }

    /* Check if date is disabled */
    isDisabled(date) {
        return isOutOfRange(date, this.minDate, this.maxDate);
    }

    /* Initialization */
    init() {
        this.createPicker();
        this.attachEventListeners();
        // an initial value of the input (value attribute or set by a script) becomes the selection
        this._syncFromInput();
    }

    /* The date in the input's value: "<date in format>" or, in datetime mode, also "<date in format> HH:mm" */
    _dateFromInput() {
        const value = this.input.value;
        const format = this.config.format;
        const dateOnly = parseFormattedDate(value, format);
        if (dateOnly || this.config.mode !== 'datetime') return dateOnly;
        const withTime = /^(.*) \d{2}:\d{2}$/.exec(value);
        return withTime ? parseFormattedDate(withTime[1], format) : null;
    }

    /* Make the selection follow the input's value (date / datetime). Nothing changes when the value is the selected
       day; an unreadable value clears the selection without touching the value. Formats that cannot be read back
       (without YYYY, MM or DD) are left alone. */
    _syncFromInput() {
        const mode = this.config.mode;
        if ((mode !== 'date' && mode !== 'datetime') || !isReadableFormat(this.config.format)) return;
        const date = this._dateFromInput();
        if (date) {
            if (!this.selectedDate || !this.isSameDay(date, this.selectedDate)) {
                this.selectedDate = date;
                this.viewDate = new Date(date);
            }
        } else if (this.selectedDate) {
            this.selectedDate = null;
        }
    }

    /* Create Picker DOM based on mode */
    createPicker() {
        const picker = document.createElement('div');
        picker.className = 'date-picker';
        picker.setAttribute('role', 'dialog');
        picker.setAttribute('aria-modal', 'true');
        picker.setAttribute('aria-label', this._ariaLabel);

        const mode = this.config.mode;
        const controls = `
                <div class="date-picker-controls">
                    <button type="button" class="clear-button" disabled>クリア</button>
                    <div class="month-navigation">
                        <button type="button" class="nav-button prev-month" aria-label="Previous Month">‹</button>
                        <div class="month-year-display" aria-live="polite"></div>
                        <button type="button" class="nav-button next-month" aria-label="Next Month">›</button>
                    </div>
                    <button type="button" class="today-button">今日</button>
                </div>`;
        const timeContainer = `
                        <div class="dp-time-container">
                            <div class="dp-time-column dp-hour-column" role="listbox" aria-label="Hours"></div>
                            <div class="dp-time-column dp-minute-column" role="listbox" aria-label="Minutes"></div>
                        </div>`;

        if (mode === 'time') {
            picker.classList.add('dp-time-only');
            picker.innerHTML = `
                <div class="date-picker-controls dp-time-controls">
                    <button type="button" class="clear-button" disabled>クリア</button>
                </div>${timeContainer}`;
        } else if (mode === 'datetime') {
            picker.classList.add('dp-datetime');
            picker.innerHTML = `${controls}
                <div class="dp-datetime-body">
                    <div class="dp-calendar-section">
                        <div class="calendar-grid" role="grid"></div>
                    </div>
                    <div class="dp-time-section">${timeContainer}
                    </div>
                </div>
            `;
        } else {
            // date mode (default)
            picker.innerHTML = `${controls}
                <div class="calendar-grid" role="grid"></div>
            `;
        }

        this.wrapper.appendChild(picker);

        /* Store references */
        this.picker = picker;
        this.monthYearDisplay = picker.querySelector('.month-year-display');
        this.calendarGrid = picker.querySelector('.calendar-grid');
        this.prevButton = picker.querySelector('.prev-month');
        this.nextButton = picker.querySelector('.next-month');
        this.todayButton = picker.querySelector('.today-button');
        this.clearButton = picker.querySelector('.clear-button');
        this.hourColumn = picker.querySelector('.dp-hour-column');
        this.minuteColumn = picker.querySelector('.dp-minute-column');

        // Generate time options if applicable
        if (mode === 'time' || mode === 'datetime') {
            this.timeColumns = new TimeColumns(this.hourColumn, this.minuteColumn, TIME_CLASSES, this.config.minuteStep);
            this.generateTimeOptions();
        }

        this.createOverlay();
    }

    /* Generate time column options */
    generateTimeOptions() {
        // read the step each time, as before: changing config.minuteStep and calling this again re-renders with it
        this.timeColumns.render(this.config.minuteStep);
    }

    /* Select hour */
    selectHour(hour) {
        this.selectedHour = hour;
        this.timeColumns.select('hour', hour);
        this.setInputValue();
    }

    /* Select minute */
    selectMinute(minute) {
        this.selectedMinute = minute;
        this.timeColumns.select('minute', minute);
        this.setInputValue();
    }

    /* Select hour and minute together and write the value once (one change event) */
    _applyTime(hour, minute) {
        this.selectedHour = hour;
        this.selectedMinute = minute;
        this.timeColumns.select('hour', hour);
        this.timeColumns.select('minute', minute);
        this.setInputValue();
    }

    /* Scroll time column so selected item is centered */
    scrollToTimeSelection(container) {
        TimeColumns.scrollToSelection(container);
    }

    /* Background Overlay */
    createOverlay() {
        if (!document.querySelector('.dp-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'dp-overlay';
            document.body.appendChild(overlay);
        }
    }

    /* Event Binding */
    attachEventListeners() {
        const mode = this.config.mode;

        /* Store bound handlers for cleanup in destroy() */
        this._onInputClick = () => this.show();
        this._onInputKeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.show();
            }
            if (e.key === 'Escape' && this.picker.classList.contains('show')) {
                e.preventDefault();
                this.hide();
            }
        };
        this._onDocumentClick = (e) => {
            if (!this.wrapper.contains(e.target) && !this.picker.contains(e.target)) {
                this.hide();
            }
        };

        /* Input Click -> Show Picker */
        this.input.addEventListener('click', this._onInputClick);

        /* Keyboard Support for Input */
        this.input.addEventListener('keydown', this._onInputKeydown);

        /* Clear Button (every mode) */
        this.clearButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectedDate = null;
            this.selectedHour = null;
            this.selectedMinute = null;
            // update the UI first so that change listeners see the final state
            if (mode === 'date' || mode === 'datetime') {
                this.updateCalendar();
            }
            if (mode === 'time' || mode === 'datetime') {
                // Reset time selection UI
                this.timeColumns.clearSelection();
            }
            this.input.value = '';
            this._updateClearButton();
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
            this.hide();
            this.input.focus();
        });

        /* Calendar controls (date / datetime only) */
        if (mode === 'date' || mode === 'datetime') {
            /* Month Navigation */
            this.prevButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewDate = makeDate(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
                this.updateCalendar();
            });
            this.nextButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewDate = makeDate(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
                this.updateCalendar();
            });

            /* Today Button */
            this.todayButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const today = new Date();
                if (this.isDisabled(today)) return;
                this.selectedDate = today;
                this.viewDate = new Date();
                this.updateCalendar();
                this.setInputValue();
                if (mode === 'date') {
                    this.hide();
                    this.input.focus();
                }
            });

            /* Keyboard Navigation in Calendar Grid (moves by dates; switches the month when it crosses one) */
            this.calendarGrid.addEventListener('keydown', (e) => {
                const current = this._dayDates.get(document.activeElement);
                if (!current) return;

                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    document.activeElement.click();
                    return;
                }

                let target;
                if (e.key === 'Home' || e.key === 'End') {
                    target = this._edgeEnabledDay(e.key === 'Home');
                } else {
                    target = keyTargetDate(current, e.key);
                    if (target === null) return; // not a navigation key
                }
                e.preventDefault();
                // beyond minDate / maxDate (or no enabled day): the focus stays where it is
                if (!target || this.isDisabled(target)) return;
                this._focusDate(target);
            });
        }

        /* Time column click events (time / datetime) */
        if (mode === 'time' || mode === 'datetime') {
            /* Keyboard in the columns: ↑ ↓ Home End select at once, ← → switch columns, Enter closes */
            const onColumnKeydown = (e) => {
                const onItem = this.timeColumns.itemValue(e.target, 'hour') !== null
                    || this.timeColumns.itemValue(e.target, 'minute') !== null;
                if (e.key === 'Enter' && onItem) {
                    e.preventDefault();
                    this.hide();
                    this.input.focus();
                    return;
                }
                this.timeColumns.handleKeydown(e, (kind, value) => {
                    if (kind === 'hour') this.selectHour(value);
                    else this.selectMinute(value);
                });
            };
            this.hourColumn.addEventListener('keydown', onColumnKeydown);
            this.minuteColumn.addEventListener('keydown', onColumnKeydown);

            this.hourColumn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hour = this.timeColumns.itemValue(e.target, 'hour');
                if (hour !== null) this.selectHour(hour);
            });
            this.minuteColumn.addEventListener('click', (e) => {
                e.stopPropagation();
                const minute = this.timeColumns.itemValue(e.target, 'minute');
                if (minute !== null) this.selectMinute(minute);
            });
        }

        /* Close on Outside Click */
        document.addEventListener('click', this._onDocumentClick);

        /* Escape Key to Close */
        this.picker.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
                this.input.focus();
            }
        });

        /* Focus Trap */
        this.picker.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const focusable = this.picker.querySelectorAll(
                'button:not([disabled]):not([tabindex="-1"]), [role="option"][tabindex="0"]'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });
    }

    /* Focus the button of `date`, switching the displayed month first when needed */
    _focusDate(date) {
        if (date.getFullYear() !== this.viewDate.getFullYear() || date.getMonth() !== this.viewDate.getMonth()) {
            this.viewDate = makeDate(date.getFullYear(), date.getMonth(), 1);
            this.updateCalendar();
        }
        const button = Array.from(this.calendarGrid.querySelectorAll('.calendar-day:not(.other-month)'))
            .find(b => this._dayDates.has(b) && this.isSameDay(this._dayDates.get(b), date));
        if (button) button.focus();
    }

    /* The first (or last) enabled day of the displayed month, or null when there is none */
    _edgeEnabledDay(first) {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        const days = buildMonthCells(year, month).filter(c => !c.otherMonth).map(c => c.date);
        if (!first) days.reverse();
        return days.find(d => !this.isDisabled(d)) || null;
    }

    /* Show Picker */
    show() {
        const mode = this.config.mode;

        /* Close all other open pickers first */
        this._registry.instances.forEach(instance => {
            if (instance !== this) instance.closePicker();
        });

        /* The value may have been set or changed by a script since the last time */
        this._syncFromInput();

        if (mode === 'date' || mode === 'datetime') {
            this.updateCalendar();
        }

        this.picker.classList.add('show');
        /* the overlay is shared with the other bundle's pickers; make sure it exists */
        this.createOverlay();
        document.querySelector('.dp-overlay').classList.add('show');

        /* Time initialization on show */
        if (mode === 'time' || mode === 'datetime') {
            this._initTimeOnShow();
        }
        this._updateClearButton();
        if (mode === 'time') {
            /* Move focus into the picker: the selected hour */
            this.timeColumns.focusItem('hour');
        }

        /* Move focus into the picker */
        if (mode === 'date' || mode === 'datetime') {
            const selected = this.calendarGrid.querySelector('.calendar-day.selected:not(.disabled)');
            const today = this.calendarGrid.querySelector('.calendar-day.today:not(.disabled)');
            const firstEnabled = this.calendarGrid.querySelector('.calendar-day:not(.disabled):not(.other-month)');
            const target = selected || today || firstEnabled;
            if (target) target.focus();
        }
    }

    /* Initialize time selection when picker opens */
    _initTimeOnShow() {
        const currentValue = this.input.value;
        let hourToSelect = null;
        let minuteToSelect = null;

        if (currentValue) {
            // Parse existing value
            const parsed = this.config.mode === 'datetime'
                ? matchDateTimeTime(currentValue, this.config.format)
                : matchTimeValue(currentValue);
            if (parsed) {
                hourToSelect = parsed.hour;
                minuteToSelect = parsed.minute;
            }
        }

        if (!hourToSelect || !minuteToSelect) {
            // Use current time as default
            const now = nearestTime(new Date(), this.config.minuteStep);
            hourToSelect = now.hour;
            minuteToSelect = now.minute;
        }

        this._applyTime(hourToSelect, minuteToSelect);

        setTimeout(() => {
            this.scrollToTimeSelection(this.hourColumn);
            this.scrollToTimeSelection(this.minuteColumn);
        }, 10);
    }

    /* Close this picker without touching the overlay */
    closePicker() {
        this.picker.classList.remove('show');
    }

    /* Hide Picker */
    hide() {
        this.picker.classList.remove('show');
        /* Only hide overlay if no other picker is open (of any class: the overlay is shared on the page) */
        if (!document.querySelector('.date-picker.show')) {
            document.querySelector('.dp-overlay')?.classList.remove('show');
        }
    }

    /* Generate/Update Calendar */
    updateCalendar() {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();

        this.monthYearDisplay.textContent = `${year}年${month + 1}月`;
        this._dayDates = new WeakMap(); // enabled day button -> its date (keyboard navigation)
        this._updateClearButton();
        this.calendarGrid.innerHTML = '';

        /* Weekday Headers */
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        weekdays.forEach((day, idx) => {
            const header = document.createElement('div');
            header.className = 'weekday-header';
            if (idx === 0) header.classList.add('sunday');
            if (idx === 6) header.classList.add('saturday');
            header.textContent = day;
            header.setAttribute('role', 'columnheader');
            this.calendarGrid.appendChild(header);
        });

        /* Day Cells */
        for (const { date, otherMonth } of buildMonthCells(year, month)) {
            this.createDayElement(date, otherMonth);
        }
    }

    /* Create Single Day Element */
    createDayElement(date, isOtherMonth) {
        const mode = this.config.mode;
        const dayEl = document.createElement('button');
        dayEl.className = 'calendar-day';
        dayEl.textContent = date.getDate();
        dayEl.setAttribute('type', 'button');

        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) dayEl.classList.add('sunday');
        if (dayOfWeek === 6) dayEl.classList.add('saturday');
        if (this.isHoliday(date)) dayEl.classList.add('holiday');

        if (isOtherMonth) dayEl.classList.add('other-month');
        if (this.isToday(date)) dayEl.classList.add('today');
        if (this.selectedDate && this.isSameDay(date, this.selectedDate)) {
            dayEl.classList.add('selected');
            dayEl.setAttribute('aria-selected', 'true');
        }

        // Check if date is disabled
        const disabled = this.isDisabled(date);
        if (disabled) {
            dayEl.classList.add('disabled');
            dayEl.setAttribute('disabled', 'true');
            dayEl.setAttribute('tabindex', '-1');
        } else {
            dayEl.setAttribute('tabindex', isOtherMonth ? '-1' : '0');
            this._dayDates.set(dayEl, date);
            /* Click Selection */
            dayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedDate = date;
                this.viewDate = new Date(date);
                this.updateCalendar();
                this.setInputValue();
                if (mode === 'date') {
                    // date mode: close on click
                    this.hide();
                    this.input.focus();
                } else {
                    // datetime mode: keep open so user can also pick time. The calendar was rebuilt, so put the
                    // focus back on the picked day (otherwise it falls to <body> and Escape / Tab stop working)
                    this._focusDate(date);
                }
            });
        }

        this.calendarGrid.appendChild(dayEl);
    }

    /* The clear button is enabled exactly when the input has a value (there is something to clear) */
    _updateClearButton() {
        this.clearButton.disabled = this.input.value === '';
    }

    /* Redraw an open calendar after the holidays changed (holiday.csv arrived), keeping the focused day focused.
       A closed or destroyed picker does nothing: the calendar is drawn again when it opens. */
    refreshHolidays() {
        const mode = this.config.mode;
        if ((mode !== 'date' && mode !== 'datetime') || !this.picker.classList.contains('show')) return;
        const focusedDay = this._dayDates.get(document.activeElement);
        this.updateCalendar();
        if (focusedDay) this._focusDate(focusedDay);
    }

    /* Is Today */
    isToday(date) { return this.isSameDay(date, new Date()); }

    /* Is Same Day */
    isSameDay(a, b) { return isSameDay(a, b); }

    /* Is Holiday */
    isHoliday(date) { return this.holidays.has(holidayKey(date)); }

    /* Set Input Value */
    setInputValue() {
        const mode = this.config.mode;

        if (mode === 'time') {
            if (this.selectedHour !== null && this.selectedMinute !== null) {
                this.input.value = `${this.selectedHour}:${this.selectedMinute}`;
                this._updateClearButton();
                this.input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }

        if (mode === 'datetime') {
            if (!this.selectedDate) return;
            const timePart = (this.selectedHour !== null && this.selectedMinute !== null)
                ? ` ${this.selectedHour}:${this.selectedMinute}`
                : '';
            // the format applies to the date part; the time is appended as " HH:mm"
            this.input.value = `${formatDate(this.selectedDate, this.config.format)}${timePart}`;
            this._updateClearButton();
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        // date mode
        if (!this.selectedDate) return;
        this.input.value = formatDate(this.selectedDate, this.config.format);
        this._updateClearButton();
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /* Cleanup */
    destroy() {
        this.hide();

        /* Remove document-level listener */
        document.removeEventListener('click', this._onDocumentClick);

        /* Remove input listeners */
        this.input.removeEventListener('click', this._onInputClick);
        this.input.removeEventListener('keydown', this._onInputKeydown);

        /* Remove picker DOM */
        this.picker.remove();

        /* Remove from instances */
        const instances = this._registry.instances;
        const idx = instances.indexOf(this);
        if (idx !== -1) instances.splice(idx, 1);

        const live = this.wrapper[PICKER_KEY];
        if (live) {
            live.delete(this);
            if (live.size === 0) delete this.wrapper[PICKER_KEY];
        }

        /* Remove overlay when no picker of any class remains on the page */
        if (!document.querySelector('.date-picker')) {
            const overlay = document.querySelector('.dp-overlay');
            if (overlay) overlay.remove();
        }
    }
}
