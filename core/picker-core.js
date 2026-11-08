/* ----------------------------------------------------------
   core/picker-core.js : the picker shared by DatePicker and DateTimePicker
   mode: 'date' | 'time' | 'datetime'
---------------------------------------------------------- */

import {
    parseDateOption, isOutOfRange, isSameDay, holidayKey, formatDate, buildMonthCells,
} from './date-utils.js';
import { nearestTime, matchTimeValue } from './time-utils.js';
import { TimeColumns } from './time-columns.js';

const TIME_CLASSES = { item: 'dp-time-item', hourItem: 'dp-hour-item', minuteItem: 'dp-minute-item' };

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

        // Parse minDate/maxDate
        this.minDate = this.parseDate(this.config.minDate);
        this.maxDate = this.parseDate(this.config.maxDate);

        // Holidays (Set of "YYYY/M/D" strings)
        this.holidays = options.holidays instanceof Set
            ? options.holidays
            : new Set(options.holidays || []);

        this.selectedDate = null;
        this.viewDate = new Date();
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
            picker.innerHTML = timeContainer;
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
        this.timeColumns.render();
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

        /* Calendar controls (date / datetime only) */
        if (mode === 'date' || mode === 'datetime') {
            /* Month Navigation */
            this.prevButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
                this.updateCalendar();
            });
            this.nextButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
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

            /* Clear Button */
            this.clearButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedDate = null;
                this.selectedHour = null;
                this.selectedMinute = null;
                this.input.value = '';
                this.input.dispatchEvent(new Event('change', { bubbles: true }));
                this.updateCalendar();
                if (mode === 'datetime') {
                    // Reset time selection UI
                    this.timeColumns.clearSelection();
                }
                this.hide();
                this.input.focus();
            });

            /* Arrow Key Navigation in Calendar Grid */
            this.calendarGrid.addEventListener('keydown', (e) => {
                const dayButtons = Array.from(
                    this.calendarGrid.querySelectorAll('.calendar-day:not(.disabled)')
                );
                const currentIdx = dayButtons.indexOf(document.activeElement);
                if (currentIdx === -1) return;

                let targetIdx = -1;
                switch (e.key) {
                    case 'ArrowRight':
                        e.preventDefault();
                        targetIdx = currentIdx + 1;
                        if (targetIdx >= dayButtons.length) {
                            this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
                            this.updateCalendar();
                            this.focusDayByIndex(0);
                            return;
                        }
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        targetIdx = currentIdx - 1;
                        if (targetIdx < 0) {
                            this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
                            this.updateCalendar();
                            this.focusDayByIndex(-1);
                            return;
                        }
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        targetIdx = currentIdx + 7;
                        if (targetIdx >= dayButtons.length) {
                            this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
                            this.updateCalendar();
                            this.focusDayByIndex(0);
                            return;
                        }
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        targetIdx = currentIdx - 7;
                        if (targetIdx < 0) {
                            this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
                            this.updateCalendar();
                            this.focusDayByIndex(-1);
                            return;
                        }
                        break;
                    case 'Home':
                        e.preventDefault();
                        targetIdx = 0;
                        break;
                    case 'End':
                        e.preventDefault();
                        targetIdx = dayButtons.length - 1;
                        break;
                    case 'PageUp':
                        e.preventDefault();
                        this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
                        this.updateCalendar();
                        this.focusDayByIndex(Math.min(currentIdx, this.getEnabledDayCount() - 1));
                        return;
                    case 'PageDown':
                        e.preventDefault();
                        this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
                        this.updateCalendar();
                        this.focusDayByIndex(Math.min(currentIdx, this.getEnabledDayCount() - 1));
                        return;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        dayButtons[currentIdx].click();
                        return;
                    default:
                        return;
                }
                if (targetIdx >= 0 && targetIdx < dayButtons.length) {
                    dayButtons[targetIdx].focus();
                }
            });
        }

        /* Time column click events (time / datetime) */
        if (mode === 'time' || mode === 'datetime') {
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
                'button:not([disabled]):not([tabindex="-1"])'
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

    /* Focus a day button by index (negative index counts from end) */
    focusDayByIndex(index) {
        const dayButtons = this.calendarGrid.querySelectorAll(
            '.calendar-day:not(.disabled)'
        );
        if (dayButtons.length === 0) return;
        const idx = index < 0 ? dayButtons.length + index : index;
        const clamped = Math.max(0, Math.min(idx, dayButtons.length - 1));
        dayButtons[clamped].focus();
    }

    /* Get count of enabled day buttons */
    getEnabledDayCount() {
        return this.calendarGrid.querySelectorAll('.calendar-day:not(.disabled)').length;
    }

    /* Show Picker */
    show() {
        const mode = this.config.mode;

        /* Close all other open pickers first */
        this._registry.instances.forEach(instance => {
            if (instance !== this) instance.closePicker();
        });

        if (mode === 'date' || mode === 'datetime') {
            this.updateCalendar();
        }

        this.picker.classList.add('show');
        document.querySelector('.dp-overlay').classList.add('show');

        /* Time initialization on show */
        if (mode === 'time' || mode === 'datetime') {
            this._initTimeOnShow();
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
            const parsed = matchTimeValue(currentValue, this.config.mode);
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

        this.selectHour(hourToSelect);
        this.selectMinute(minuteToSelect);

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
        /* Only hide overlay if no other picker is open */
        const anyOpen = this._registry.instances.some(
            instance => instance.picker.classList.contains('show')
        );
        if (!anyOpen) {
            document.querySelector('.dp-overlay').classList.remove('show');
        }
    }

    /* Generate/Update Calendar */
    updateCalendar() {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();

        this.monthYearDisplay.textContent = `${year}年${month + 1}月`;
        this.clearButton.disabled = !this.selectedDate && this.selectedHour === null;
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
                }
                // datetime mode: keep open so user can also pick time
            });
        }

        this.calendarGrid.appendChild(dayEl);
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
                this.input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }

        if (mode === 'datetime') {
            if (!this.selectedDate) return;
            const timePart = (this.selectedHour !== null && this.selectedMinute !== null)
                ? ` ${this.selectedHour}:${this.selectedMinute}`
                : '';
            this.input.value = `${formatDate(this.selectedDate, 'YYYY/MM/DD')}${timePart}`;
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        // date mode
        if (!this.selectedDate) return;
        this.input.value = formatDate(this.selectedDate, this.config.format);
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

        /* Remove overlay if no instances remain */
        if (instances.length === 0) {
            const overlay = document.querySelector('.dp-overlay');
            if (overlay) overlay.remove();
        }
    }
}
