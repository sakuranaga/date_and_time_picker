/* ----------------------------------------------------------
   timepicker.js : Custom Time Picker Module
---------------------------------------------------------- */

import './timepicker.css';
import { TimeColumns } from './core/time-columns.js';
import { nearestTime, splitTimeValue } from './core/time-utils.js';

const TIME_CLASSES = { item: 'tp-item', hourItem: 'tp-hour-item', minuteItem: 'tp-minute-item' };

export class TimePicker {
    static instances = [];

    constructor(inputElement, options = {}) {
        this.input = typeof inputElement === 'string'
            ? document.getElementById(inputElement)
            : inputElement;

        if (!this.input) {
            console.error('TimePicker: Input element not found');
            return;
        }

        // Default configuration
        this.config = {
            minuteStep: 30, // 30, 15, 10, 5, 1
            format: 'HH:mm',
            ...options
        };

        this.wrapper = this.input.parentElement;
        this.uniqueId = 'time-picker-' + Math.random().toString(36).substr(2, 9);

        // Ensure global overlay exists
        this.ensureGlobalOverlay();
        this.overlay = document.getElementById('tp-global-overlay');

        this.selectedHour = null;
        this.selectedMinute = null;
        this.isOpen = false;
        this.justOpened = false;

        this.init();
    }

    init() {
        this.createPopup();
        this.generateTimeOptions();
        this.setupEventListeners();
        TimePicker.instances.push(this);
    }

    ensureGlobalOverlay() {
        if (!document.getElementById('tp-global-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'tp-global-overlay';
            overlay.className = 'tp-overlay';
            document.body.appendChild(overlay);

            // Global click listener for overlay
            overlay.addEventListener('click', () => {
                TimePicker.closeAllPickers();
            });
        }
    }

    createPopup() {
        this.popup = document.createElement('div');
        this.popup.className = 'tp-popup';
        this.popup.id = this.uniqueId;
        this.popup.setAttribute('role', 'dialog');
        this.popup.setAttribute('aria-modal', 'true');
        this.popup.setAttribute('aria-label', 'Time Picker');

        this.popup.innerHTML = `
            <div class="tp-container">
                <div class="tp-column tp-hour-column" role="listbox" aria-label="Hours"></div>
                <div class="tp-column tp-minute-column" role="listbox" aria-label="Minutes"></div>
            </div>
        `;

        this.wrapper.appendChild(this.popup);
        this.hourColumn = this.popup.querySelector('.tp-hour-column');
        this.minuteColumn = this.popup.querySelector('.tp-minute-column');
        this.timeColumns = new TimeColumns(this.hourColumn, this.minuteColumn, TIME_CLASSES, this.config.minuteStep);
    }

    generateTimeOptions() {
        this.timeColumns.render();
    }

    setupEventListeners() {
        // Input interactions
        this.input.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPicker();
        });

        this.input.addEventListener('focus', () => {
            this.openPicker();
        });

        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Hour selection
        this.hourColumn.addEventListener('click', (e) => {
            e.stopPropagation();
            const hour = this.timeColumns.itemValue(e.target, 'hour');
            if (hour !== null) this.selectHour(hour);
        });

        // Minute selection
        this.minuteColumn.addEventListener('click', (e) => {
            e.stopPropagation();
            const minute = this.timeColumns.itemValue(e.target, 'minute');
            if (minute !== null) this.selectMinute(minute);
        });

        // Prevent closing when clicking inside popup
        this.popup.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close on outside click (delegated to document)
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.justOpened && !this.wrapper.contains(e.target)) {
                this.closePicker();
            }
            if (this.justOpened) {
                this.justOpened = false;
            }
        });
    }

    handleKeydown(e) {
        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowUp':
                e.preventDefault();
                if (!this.isOpen) {
                    this.openPicker();
                }
                break;
            case 'Enter':
                if (!this.isOpen) {
                    e.preventDefault();
                    this.openPicker();
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.closePicker();
                this.input.focus();
                break;
            case 'Tab':
                this.closePicker();
                break;
        }
    }

    selectHour(hour) {
        this.selectedHour = hour;
        this.timeColumns.select('hour', hour);
        this.updateInputValue();
    }

    selectMinute(minute) {
        this.selectedMinute = minute;
        this.timeColumns.select('minute', minute);
        this.updateInputValue();
    }

    updateInputValue() {
        if (this.selectedHour !== null && this.selectedMinute !== null) {
            this.input.value = `${this.selectedHour}:${this.selectedMinute}`;
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    openPicker() {
        if (this.isOpen) return;

        TimePicker.closeAllPickers(this);

        this.isOpen = true;
        this.justOpened = true;
        this.popup.classList.add('show');
        this.overlay.classList.add('show');

        // Set initial selection from input value
        const currentValue = this.input.value;
        if (currentValue) {
            const [hour, minute] = splitTimeValue(currentValue);
            if (hour) this.selectHour(hour);
            if (minute) {
                // Find closest minute if step doesn't match exactly
                // For now, simple matching
                this.selectMinute(minute);
            }

            // Scroll to selection
            setTimeout(() => {
                this.scrollToSelection(this.hourColumn);
                this.scrollToSelection(this.minuteColumn);
            }, 10);
        } else {
            // 値が空の場合、現在時刻に近い位置へ選択＋スクロール
            const nearest = nearestTime(new Date(), this.config.minuteStep);

            this.selectHour(nearest.hour);
            this.selectMinute(nearest.minute);

            setTimeout(() => {
                this.scrollToSelection(this.hourColumn);
                this.scrollToSelection(this.minuteColumn);
            }, 10);
        }
    }

    scrollToItem(container, value) {
        TimeColumns.scrollToItem(container, value);
    }

    scrollToSelection(container) {
        TimeColumns.scrollToSelection(container);
    }

    closePicker() {
        this.isOpen = false;
        this.popup.classList.remove('show');
        this.overlay.classList.remove('show');
    }

    setValue(timeString) {
        if (timeString && /^\d{2}:\d{2}$/.test(timeString)) {
            this.input.value = timeString;
            const [hour, minute] = timeString.split(':');
            this.selectedHour = hour;
            this.selectedMinute = minute;
        }
    }

    getValue() {
        return this.input.value;
    }

    destroy() {
        if (this.popup && this.popup.parentNode) {
            this.popup.parentNode.removeChild(this.popup);
        }
        TimePicker.instances = TimePicker.instances.filter(i => i !== this);
    }

    static closeAllPickers(except = null) {
        TimePicker.instances.forEach(instance => {
            if (instance !== except && instance.isOpen) {
                instance.closePicker();
            }
        });
    }
}

// Auto-initialization
if (typeof document !== 'undefined') {
    const init = () => {
        document.querySelectorAll('.tp-input').forEach(input => {
            const step = parseInt(input.dataset.minuteStep, 10) || 30;
            new TimePicker(input, { minuteStep: step });
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
