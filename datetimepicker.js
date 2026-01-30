/* ----------------------------------------------------------
   datetimepicker.js : Custom DateTime Picker Module
   mode: 'date' | 'time' | 'datetime'
---------------------------------------------------------- */

import './datetimepicker.css';

export class DateTimePicker {
    static instances = [];

    constructor(wrapper, options = {}) {
        this.wrapper = wrapper;
        this.input = wrapper.querySelector('.date-input');

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

        DateTimePicker.instances.push(this);
        this.init();
    }

    /* Parse date option */
    parseDate(value) {
        if (!value) return null;
        if (value === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        }
        if (value instanceof Date) return value;
        const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
            return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        }
        const parsed = new Date(value);
        return isNaN(parsed) ? null : parsed;
    }

    /* Check if date is disabled */
    isDisabled(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);

        if (this.minDate) {
            const min = new Date(this.minDate);
            min.setHours(0, 0, 0, 0);
            if (d < min) return true;
        }
        if (this.maxDate) {
            const max = new Date(this.maxDate);
            max.setHours(0, 0, 0, 0);
            if (d > max) return true;
        }
        return false;
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
        picker.setAttribute('aria-label', 'DateTime Picker');

        const mode = this.config.mode;

        if (mode === 'time') {
            picker.classList.add('dp-time-only');
            picker.innerHTML = `
                <div class="dp-time-container">
                    <div class="dp-time-column dp-hour-column" role="listbox" aria-label="Hours"></div>
                    <div class="dp-time-column dp-minute-column" role="listbox" aria-label="Minutes"></div>
                </div>
            `;
        } else if (mode === 'datetime') {
            picker.classList.add('dp-datetime');
            picker.innerHTML = `
                <div class="date-picker-controls">
                    <button type="button" class="clear-button" disabled>クリア</button>
                    <div class="month-navigation">
                        <button type="button" class="nav-button prev-month" aria-label="Previous Month">‹</button>
                        <div class="month-year-display" aria-live="polite"></div>
                        <button type="button" class="nav-button next-month" aria-label="Next Month">›</button>
                    </div>
                    <button type="button" class="today-button">今日</button>
                </div>
                <div class="dp-datetime-body">
                    <div class="dp-calendar-section">
                        <div class="calendar-grid" role="grid"></div>
                    </div>
                    <div class="dp-time-section">
                        <div class="dp-time-container">
                            <div class="dp-time-column dp-hour-column" role="listbox" aria-label="Hours"></div>
                            <div class="dp-time-column dp-minute-column" role="listbox" aria-label="Minutes"></div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // date mode (default)
            picker.innerHTML = `
                <div class="date-picker-controls">
                    <button type="button" class="clear-button" disabled>クリア</button>
                    <div class="month-navigation">
                        <button type="button" class="nav-button prev-month" aria-label="Previous Month">‹</button>
                        <div class="month-year-display" aria-live="polite"></div>
                        <button type="button" class="nav-button next-month" aria-label="Next Month">›</button>
                    </div>
                    <button type="button" class="today-button">今日</button>
                </div>
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
            this.generateTimeOptions();
        }

        this.createOverlay();
    }

    /* Generate time column options */
    generateTimeOptions() {
        // Hours (00-23)
        let hourHTML = '';
        for (let i = 0; i < 24; i++) {
            const hour = i.toString().padStart(2, '0');
            hourHTML += `<div class="dp-time-item dp-hour-item" data-value="${hour}" role="option" tabindex="-1">${hour}</div>`;
        }
        this.hourColumn.innerHTML = hourHTML;

        // Minutes based on step
        let minuteHTML = '';
        for (let i = 0; i < 60; i += this.config.minuteStep) {
            const minute = i.toString().padStart(2, '0');
            minuteHTML += `<div class="dp-time-item dp-minute-item" data-value="${minute}" role="option" tabindex="-1">${minute}</div>`;
        }
        this.minuteColumn.innerHTML = minuteHTML;
    }

    /* Select hour */
    selectHour(hour) {
        this.selectedHour = hour;
        this.hourColumn.querySelectorAll('.dp-hour-item').forEach(item => {
            const isSelected = item.dataset.value === hour;
            item.classList.toggle('selected', isSelected);
            item.setAttribute('aria-selected', isSelected);
        });
        this.setInputValue();
    }

    /* Select minute */
    selectMinute(minute) {
        this.selectedMinute = minute;
        this.minuteColumn.querySelectorAll('.dp-minute-item').forEach(item => {
            const isSelected = item.dataset.value === minute;
            item.classList.toggle('selected', isSelected);
            item.setAttribute('aria-selected', isSelected);
        });
        this.setInputValue();
    }

    /* Scroll time column so selected item is centered */
    scrollToTimeSelection(container) {
        const selected = container.querySelector('.selected');
        if (selected) {
            container.scrollTop = selected.offsetTop - container.offsetTop
                - (container.clientHeight / 2) + (selected.clientHeight / 2);
        }
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
                    if (this.hourColumn) {
                        this.hourColumn.querySelectorAll('.dp-hour-item').forEach(item => {
                            item.classList.remove('selected');
                            item.setAttribute('aria-selected', false);
                        });
                    }
                    if (this.minuteColumn) {
                        this.minuteColumn.querySelectorAll('.dp-minute-item').forEach(item => {
                            item.classList.remove('selected');
                            item.setAttribute('aria-selected', false);
                        });
                    }
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
                if (e.target.classList.contains('dp-hour-item')) {
                    this.selectHour(e.target.dataset.value);
                }
            });
            this.minuteColumn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (e.target.classList.contains('dp-minute-item')) {
                    this.selectMinute(e.target.dataset.value);
                }
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
        DateTimePicker.instances.forEach(instance => {
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
            const mode = this.config.mode;
            if (mode === 'time') {
                const match = currentValue.match(/(\d{2}):(\d{2})/);
                if (match) {
                    hourToSelect = match[1];
                    minuteToSelect = match[2];
                }
            } else if (mode === 'datetime') {
                const match = currentValue.match(/(\d{2}):(\d{2})$/);
                if (match) {
                    hourToSelect = match[1];
                    minuteToSelect = match[2];
                }
            }
        }

        if (!hourToSelect || !minuteToSelect) {
            // Use current time as default
            const now = new Date();
            hourToSelect = now.getHours().toString().padStart(2, '0');
            const currentMinute = now.getMinutes();
            const step = this.config.minuteStep;
            minuteToSelect = (Math.round(currentMinute / step) * step % 60)
                .toString().padStart(2, '0');
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
        const anyOpen = DateTimePicker.instances.some(
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
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);
        const startWeekday = firstDay.getDay();

        /* Previous Month Days */
        for (let i = startWeekday - 1; i >= 0; i--) {
            const day = prevLastDay.getDate() - i;
            this.createDayElement(new Date(year, month - 1, day), true);
        }

        /* Current Month Days */
        for (let day = 1; day <= lastDay.getDate(); day++) {
            this.createDayElement(new Date(year, month, day), false);
        }

        /* Next Month Days */
        const filled = startWeekday + lastDay.getDate();
        const remain = 42 - filled;
        for (let day = 1; day <= remain; day++) {
            this.createDayElement(new Date(year, month + 1, day), true);
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
    isSameDay(a, b) {
        return a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();
    }

    /* Is Holiday */
    isHoliday(date) {
        const key = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        return this.holidays.has(key);
    }

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
            const y = this.selectedDate.getFullYear();
            const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
            const d = String(this.selectedDate.getDate()).padStart(2, '0');
            const timePart = (this.selectedHour !== null && this.selectedMinute !== null)
                ? ` ${this.selectedHour}:${this.selectedMinute}`
                : '';
            this.input.value = `${y}/${m}/${d}${timePart}`;
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        // date mode
        if (!this.selectedDate) return;
        const y = this.selectedDate.getFullYear();
        const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(this.selectedDate.getDate()).padStart(2, '0');

        let value = this.config.format
            .replace('YYYY', y)
            .replace('MM', m)
            .replace('DD', d);

        this.input.value = value;
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
        const idx = DateTimePicker.instances.indexOf(this);
        if (idx !== -1) DateTimePicker.instances.splice(idx, 1);

        /* Remove overlay if no instances remain */
        if (DateTimePicker.instances.length === 0) {
            const overlay = document.querySelector('.dp-overlay');
            if (overlay) overlay.remove();
        }
    }
}

// Parse holiday CSV text into a Set of "YYYY/M/D" strings
function parseHolidayCsv(text) {
    const holidays = new Set();
    const datePattern = /^(\d{4}\/\d{1,2}\/\d{1,2})/;
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const m = line.match(datePattern);
        if (m) holidays.add(m[1]);
    }
    return holidays;
}

// Resolve base path from the script's src attribute
function resolveBasePath() {
    const currentScript = document.currentScript
        || (() => {
            const scripts = document.querySelectorAll('script[src]');
            return scripts[scripts.length - 1];
        })();
    if (currentScript && currentScript.src) {
        return currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);
    }
    return '';
}

// Auto-initialization
if (typeof document !== 'undefined') {
    const basePath = resolveBasePath();
    const csvUrl = basePath + 'holiday.csv';

    const initWithHolidays = (holidays) => {
        document.querySelectorAll('.date-picker-wrapper').forEach(wrapper => {
            // Read options from data attributes
            const options = { holidays };
            if (wrapper.dataset.minDate) {
                options.minDate = wrapper.dataset.minDate;
            }
            if (wrapper.dataset.maxDate) {
                options.maxDate = wrapper.dataset.maxDate;
            }
            if (wrapper.dataset.format) {
                options.format = wrapper.dataset.format;
            }
            if (wrapper.dataset.mode) {
                options.mode = wrapper.dataset.mode;
            }
            if (wrapper.dataset.minuteStep) {
                options.minuteStep = parseInt(wrapper.dataset.minuteStep, 10) || 30;
            }
            new DateTimePicker(wrapper, options);
        });
    };

    const init = () => {
        fetch(csvUrl)
            .then(r => {
                if (!r.ok) throw new Error(r.status);
                return r.text();
            })
            .then(text => parseHolidayCsv(text))
            .catch(() => new Set())
            .then(holidays => initWithHolidays(holidays));
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
