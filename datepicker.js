/* ----------------------------------------------------------
   datepicker.js : Custom Date Picker Module
---------------------------------------------------------- */

import './datepicker.css';

export class DatePicker {
    static instances = [];

    constructor(wrapper, options = {}) {
        this.wrapper = wrapper;
        this.input = wrapper.querySelector('.date-input');

        // Configuration
        this.config = {
            format: 'YYYY/MM/DD',
            minDate: null,
            maxDate: null,
            ...options
        };

        // Parse minDate/maxDate
        this.minDate = this.parseDate(this.config.minDate);
        this.maxDate = this.parseDate(this.config.maxDate);

        this.selectedDate = null;
        this.currentDate = new Date();
        this.viewDate = new Date();

        DatePicker.instances.push(this);
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
        // Parse YYYY-MM-DD format
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

    /* Create Picker DOM */
    createPicker() {
        const picker = document.createElement('div');
        picker.className = 'date-picker';
        picker.setAttribute('role', 'dialog');
        picker.setAttribute('aria-modal', 'true');
        picker.setAttribute('aria-label', 'Date Picker');

        picker.innerHTML = `
            <div class="date-picker-controls">
                <div class="month-navigation">
                    <button type="button" class="nav-button prev-month" aria-label="Previous Month">‹</button>
                    <div class="month-year-display" aria-live="polite"></div>
                    <button type="button" class="nav-button next-month" aria-label="Next Month">›</button>
                </div>
                <button type="button" class="today-button">今日</button>
            </div>
            <div class="calendar-grid" role="grid"></div>
        `;
        this.wrapper.appendChild(picker);

        /* Store references */
        this.picker = picker;
        this.monthYearDisplay = picker.querySelector('.month-year-display');
        this.calendarGrid = picker.querySelector('.calendar-grid');
        this.prevButton = picker.querySelector('.prev-month');
        this.nextButton = picker.querySelector('.next-month');
        this.todayButton = picker.querySelector('.today-button');

        this.createOverlay();
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
        /* Input Click -> Show Picker */
        this.input.addEventListener('click', () => this.show());

        /* Keyboard Support for Input */
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.show();
            }
        });

        /* Month Navigation */
        this.prevButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.viewDate.setMonth(this.viewDate.getMonth() - 1);
            this.updateCalendar();
        });
        this.nextButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.viewDate.setMonth(this.viewDate.getMonth() + 1);
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
            this.hide();
            this.input.focus();
        });

        /* Close on Outside Click */
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target) && !this.picker.contains(e.target)) {
                this.hide();
            }
        });

        /* Escape Key to Close */
        this.picker.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
                this.input.focus();
            }
        });
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.picker.classList.contains('show')) {
                e.preventDefault();
                this.hide();
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
                        this.viewDate.setMonth(this.viewDate.getMonth() + 1);
                        this.updateCalendar();
                        this.focusDayByIndex(0);
                        return;
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    targetIdx = currentIdx - 1;
                    if (targetIdx < 0) {
                        this.viewDate.setMonth(this.viewDate.getMonth() - 1);
                        this.updateCalendar();
                        this.focusDayByIndex(-1);
                        return;
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    targetIdx = currentIdx + 7;
                    if (targetIdx >= dayButtons.length) {
                        this.viewDate.setMonth(this.viewDate.getMonth() + 1);
                        this.updateCalendar();
                        this.focusDayByIndex(0);
                        return;
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    targetIdx = currentIdx - 7;
                    if (targetIdx < 0) {
                        this.viewDate.setMonth(this.viewDate.getMonth() - 1);
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
                    this.viewDate.setMonth(this.viewDate.getMonth() - 1);
                    this.updateCalendar();
                    this.focusDayByIndex(Math.min(currentIdx, this.getEnabledDayCount() - 1));
                    return;
                case 'PageDown':
                    e.preventDefault();
                    this.viewDate.setMonth(this.viewDate.getMonth() + 1);
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
        /* Close all other open pickers first */
        DatePicker.instances.forEach(instance => {
            if (instance !== this) instance.closePicker();
        });

        this.updateCalendar();
        this.picker.classList.add('show');
        document.querySelector('.dp-overlay').classList.add('show');

        /* Move focus into the picker */
        const selected = this.calendarGrid.querySelector('.calendar-day.selected:not(.disabled)');
        const today = this.calendarGrid.querySelector('.calendar-day.today:not(.disabled)');
        const firstEnabled = this.calendarGrid.querySelector('.calendar-day:not(.disabled):not(.other-month)');
        const target = selected || today || firstEnabled;
        if (target) target.focus();
    }

    /* Close this picker without touching the overlay */
    closePicker() {
        this.picker.classList.remove('show');
    }

    /* Hide Picker */
    hide() {
        this.picker.classList.remove('show');
        /* Only hide overlay if no other picker is open */
        const anyOpen = DatePicker.instances.some(
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
        const dayEl = document.createElement('button');
        dayEl.className = 'calendar-day';
        dayEl.textContent = date.getDate();
        dayEl.setAttribute('type', 'button');

        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) dayEl.classList.add('sunday');
        if (dayOfWeek === 6) dayEl.classList.add('saturday');

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
                this.hide();
                this.input.focus();
            });
        }

        this.calendarGrid.appendChild(dayEl);
    }

    /* Is Today */
    isToday(date) { return this.isSameDay(date, this.currentDate); }

    /* Is Same Day */
    isSameDay(a, b) {
        return a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();
    }

    /* Set Input Value */
    setInputValue() {
        if (!this.selectedDate) return;
        const y = this.selectedDate.getFullYear();
        const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(this.selectedDate.getDate()).padStart(2, '0');

        // Use configured format (Simple implementation)
        let value = this.config.format
            .replace('YYYY', y)
            .replace('MM', m)
            .replace('DD', d);

        this.input.value = value;
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// Auto-initialization
if (typeof document !== 'undefined') {
    const init = () => {
        document.querySelectorAll('.date-picker-wrapper').forEach(wrapper => {
            // Read options from data attributes
            const options = {};
            if (wrapper.dataset.minDate) {
                options.minDate = wrapper.dataset.minDate;
            }
            if (wrapper.dataset.maxDate) {
                options.maxDate = wrapper.dataset.maxDate;
            }
            if (wrapper.dataset.format) {
                options.format = wrapper.dataset.format;
            }
            new DatePicker(wrapper, options);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
