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
 * Creates a picker for every .date-picker-wrapper once the DOM is ready and holiday.csv has been tried.
 * @param {Function} PickerClass
 * @param {(wrapper: HTMLElement) => object} readOptions  options from the wrapper's data attributes
 * @param {string} basePath  directory of the script (resolveBasePath, read while the script is evaluated)
 */
export function autoInitWrappers(PickerClass, readOptions, basePath) {
    const csvUrl = basePath + 'holiday.csv';

    const initWithHolidays = (holidays) => {
        document.querySelectorAll('.date-picker-wrapper').forEach(wrapper => {
            // skip a wrapper that already has a picker (e.g. from the other bundle on the same page)
            if (hasPicker(wrapper)) return;
            new PickerClass(wrapper, { holidays, ...readOptions(wrapper) });
        });
    };

    const init = () => {
        loadHolidays(csvUrl).then(holidays => initWithHolidays(holidays));
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
