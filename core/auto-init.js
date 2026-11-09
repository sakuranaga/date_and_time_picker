/* ----------------------------------------------------------
   core/auto-init.js : auto-initialization of .date-picker-wrapper elements (DatePicker / DateTimePicker)
---------------------------------------------------------- */

import { loadHolidays } from './holidays.js';
import { hasPicker } from './picker-core.js';

/** Options common to the calendar pickers, from the wrapper's data attributes. */
export function readDateOptions(wrapper) {
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
    return options;
}

/**
 * Creates a picker for every .date-picker-wrapper as soon as the DOM is ready, without waiting for holiday.csv.
 * The holidays are added when they arrive (an open calendar is redrawn); holiday.csv is fetched only when one of the
 * created pickers shows a calendar (date / datetime).
 * @param {Function} PickerClass
 * @param {(wrapper: HTMLElement) => object} readOptions  options from the wrapper's data attributes
 * @param {string} basePath  directory of the script (resolveBasePath, read while the script is evaluated)
 */
export function autoInitWrappers(PickerClass, readOptions, basePath) {
    const csvUrl = basePath + 'holiday.csv';

    const init = () => {
        // one Set shared by the pickers made here; filled when holiday.csv arrives
        const holidays = new Set();
        const pickers = [];
        document.querySelectorAll('.date-picker-wrapper').forEach(wrapper => {
            // skip a wrapper that already has a picker (e.g. from the other bundle on the same page)
            if (hasPicker(wrapper)) return;
            pickers.push(new PickerClass(wrapper, { holidays, ...readOptions(wrapper) }));
        });

        const usesCalendar = pickers.some(p => p.config.mode === 'date' || p.config.mode === 'datetime');
        if (!usesCalendar) return;
        loadHolidays(csvUrl).then(loaded => {
            loaded.forEach(day => holidays.add(day));
            pickers.forEach(p => p.refreshHolidays());
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
