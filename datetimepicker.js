/* ----------------------------------------------------------
   datetimepicker.js : Custom DateTime Picker Module
   mode: 'date' | 'time' | 'datetime'
---------------------------------------------------------- */

import './datetimepicker.css';
import { PickerCore } from './core/picker-core.js';
import { resolveBasePath } from './core/holidays.js';
import { autoInitWrappers, readDateOptions } from './core/auto-init.js';

export class DateTimePicker extends PickerCore {
    static instances = [];

    constructor(wrapper, options = {}) {
        super(wrapper, options, { registry: DateTimePicker, ariaLabel: 'DateTime Picker' });
    }
}

// Auto-initialization
if (typeof document !== 'undefined') {
    autoInitWrappers(DateTimePicker, (wrapper) => {
        // Read options from data attributes
        const options = readDateOptions(wrapper);
        if (wrapper.dataset.mode) {
            options.mode = wrapper.dataset.mode;
        }
        if (wrapper.dataset.minuteStep) {
            options.minuteStep = parseInt(wrapper.dataset.minuteStep, 10) || 30;
        }
        return options;
    }, resolveBasePath(document));
}
