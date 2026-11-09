/* ----------------------------------------------------------
   timepicker.js : Custom Time Picker Module
---------------------------------------------------------- */

import './timepicker.css';
import { TimeColumns } from './core/time-columns.js';
import { nearestTime, splitTimeValue, normalizeMinuteStep, parseMinuteStepAttribute } from './core/time-utils.js';

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
        // an invalid step (0, negative, not a divisor of 60...) falls back to 30
        this.config.minuteStep = normalizeMinuteStep(this.config.minuteStep);

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
        // non-modal: Tab can leave it (it then closes); focusable so that a click on its padding keeps the focus inside
        this.popup.setAttribute('tabindex', '-1');
        this.popup.setAttribute('aria-label', 'Time Picker');

        this.popup.innerHTML = `
            <div class="tp-controls">
                <button type="button" class="tp-clear-button">クリア</button>
            </div>
            <div class="tp-container">
                <div class="tp-column tp-hour-column" role="listbox" aria-label="Hours"></div>
                <div class="tp-column tp-minute-column" role="listbox" aria-label="Minutes"></div>
            </div>
        `;

        this.wrapper.appendChild(this.popup);
        this.hourColumn = this.popup.querySelector('.tp-hour-column');
        this.minuteColumn = this.popup.querySelector('.tp-minute-column');
        this.clearButton = this.popup.querySelector('.tp-clear-button');
        this.timeColumns = new TimeColumns(this.hourColumn, this.minuteColumn, TIME_CLASSES, this.config.minuteStep);
    }

    generateTimeOptions() {
        // read the step each time, as before: changing config.minuteStep and calling this again re-renders with it
        this.timeColumns.render(this.config.minuteStep);
    }

    setupEventListeners() {
        // Input interactions (kept so that destroy() can remove them)
        this._onInputClick = (e) => {
            e.stopPropagation();
            this.openPicker();
        };
        this._onInputKeydown = (e) => this.handleKeydown(e);
        this.input.addEventListener('click', this._onInputClick);
        this.input.addEventListener('keydown', this._onInputKeydown);

        // Hour selection
        // (the popup's click handler stops the propagation, and also brings the focus back after a click on padding)
        this.hourColumn.addEventListener('click', (e) => {
            const hour = this.timeColumns.itemValue(e.target, 'hour');
            if (hour !== null) this.selectHour(hour);
        });

        // Minute selection
        this.minuteColumn.addEventListener('click', (e) => {
            const minute = this.timeColumns.itemValue(e.target, 'minute');
            if (minute !== null) this.selectMinute(minute);
        });

        // Clear: empty the value, unselect, close
        this.clearButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this._clear();
        });

        // Keyboard in the columns: ↑ ↓ Home End select at once, ← → switch columns
        const onColumnKeydown = (e) => {
            this.timeColumns.handleKeydown(e, (kind, value) => {
                if (kind === 'hour') this.selectHour(value);
                else this.selectMinute(value);
            });
        };
        this.hourColumn.addEventListener('keydown', onColumnKeydown);
        this.minuteColumn.addEventListener('keydown', onColumnKeydown);

        // Escape anywhere in the popup, and Enter on an item or the popup itself, close it and return to the input
        this.popup.addEventListener('keydown', (e) => {
            const onItemOrPopup = e.target === this.popup || e.target.classList.contains('tp-item');
            if (e.key === 'Escape' || (e.key === 'Enter' && onItemOrPopup)) {
                e.preventDefault();
                this.closePicker();
                this.input.focus();
            }
        });

        // Prevent closing when clicking inside popup; a click on its padding keeps the focus in the popup
        this.popup.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isOpen && !this.popup.contains(document.activeElement)) {
                this.popup.focus({ preventScroll: true });
            }
        });

        // Close when the focus goes to an element outside the popup (Tab out, Shift+Tab back to the input...).
        // Leaving the document (another window, the browser UI) fires no focusin here, so it stays open.
        this._onDocumentFocusIn = (e) => {
            if (this.isOpen && !this.popup.contains(e.target)) {
                this.closePicker();
            }
        };
        document.addEventListener('focusin', this._onDocumentFocusIn);

        // Close on outside click (delegated to document; kept so that destroy() can remove it)
        this._onDocumentClick = (e) => {
            if (this.isOpen && !this.justOpened && !this.wrapper.contains(e.target)) {
                this.closePicker();
            }
            if (this.justOpened) {
                this.justOpened = false;
            }
        };
        document.addEventListener('click', this._onDocumentClick);
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

    /* Select hour and minute together and write the value once (one change event).
       A missing (undefined / empty) part keeps its current selection; nothing is written when neither applies. */
    _applyTime(hour, minute) {
        let applied = false;
        if (hour) {
            this.selectedHour = hour;
            this.timeColumns.select('hour', hour);
            applied = true;
        }
        if (minute) {
            this.selectedMinute = minute;
            this.timeColumns.select('minute', minute);
            applied = true;
        }
        if (applied) this.updateInputValue();
    }

    _clear() {
        this.selectedHour = null;
        this.selectedMinute = null;
        // unselect first so that change listeners see the final state
        this.timeColumns.clearSelection();
        this.input.value = '';
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
        this.closePicker();
        this.input.focus();
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
            this._applyTime(hour, minute);

            // Scroll to selection
            setTimeout(() => {
                this.scrollToSelection(this.hourColumn);
                this.scrollToSelection(this.minuteColumn);
            }, 10);
        } else {
            // 値が空の場合、現在時刻に近い位置へ選択＋スクロール
            const nearest = nearestTime(new Date(), this.config.minuteStep);
            this._applyTime(nearest.hour, nearest.minute);

            setTimeout(() => {
                this.scrollToSelection(this.hourColumn);
                this.scrollToSelection(this.minuteColumn);
            }, 10);
        }

        // Move focus into the popup: the selected hour
        this.timeColumns.focusItem('hour');
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
        // close first if open (hides the overlay); a closed picker leaves another open picker's overlay as is
        if (this.isOpen) this.closePicker();

        document.removeEventListener('click', this._onDocumentClick);
        document.removeEventListener('focusin', this._onDocumentFocusIn);
        this.input.removeEventListener('click', this._onInputClick);
        this.input.removeEventListener('keydown', this._onInputKeydown);

        if (this.popup && this.popup.parentNode) {
            this.popup.parentNode.removeChild(this.popup);
        }
        TimePicker.instances = TimePicker.instances.filter(i => i !== this);

        // the shared overlay goes with the last picker (a new picker creates it again)
        if (TimePicker.instances.length === 0) {
            const overlay = document.getElementById('tp-global-overlay');
            if (overlay) overlay.remove();
        }
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
            const step = parseMinuteStepAttribute(input.dataset.minuteStep);
            new TimePicker(input, { minuteStep: step });
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
