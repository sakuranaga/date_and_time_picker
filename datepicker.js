/* ----------------------------------------------------------
   datepicker.js : Custom Date Picker Module
---------------------------------------------------------- */

import './datepicker.css';

export class DatePicker {
    constructor(wrapper, options = {}) {
        this.wrapper = wrapper;
        this.input = wrapper.querySelector('.date-input');

        // Configuration
        this.config = {
            format: 'YYYY/MM/DD',
            ...options
        };

        this.selectedDate = null;
        this.currentDate = new Date();
        this.viewDate = new Date();

        this.init();
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
                    <button class="nav-button prev-month" aria-label="Previous Month">‹</button>
                    <div class="month-year-display" aria-live="polite"></div>
                    <button class="nav-button next-month" aria-label="Next Month">›</button>
                </div>
                <button class="today-button">今日</button>
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
            this.selectedDate = new Date();
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
    }

    /* Show Picker */
    show() {
        this.updateCalendar();
        this.picker.classList.add('show');
        document.querySelector('.dp-overlay').classList.add('show');

        // Focus management could be added here
    }

    /* Hide Picker */
    hide() {
        this.picker.classList.remove('show');
        document.querySelector('.dp-overlay').classList.remove('show');
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
        const dayEl = document.createElement('button'); // Changed to button for accessibility
        dayEl.className = 'calendar-day';
        dayEl.textContent = date.getDate();
        dayEl.setAttribute('type', 'button');
        dayEl.setAttribute('tabindex', isOtherMonth ? '-1' : '0');

        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) dayEl.classList.add('sunday');
        if (dayOfWeek === 6) dayEl.classList.add('saturday');

        if (isOtherMonth) dayEl.classList.add('other-month');
        if (this.isToday(date)) dayEl.classList.add('today');
        if (this.selectedDate && this.isSameDay(date, this.selectedDate)) {
            dayEl.classList.add('selected');
            dayEl.setAttribute('aria-selected', 'true');
        }

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
            new DatePicker(wrapper);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
