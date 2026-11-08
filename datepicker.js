/* ----------------------------------------------------------
   datepicker.js : Custom Date Picker Module
   (the calendar of PickerCore with the mode fixed to 'date')
---------------------------------------------------------- */

import './datepicker.css';
import { PickerCore } from './core/picker-core.js';
import { resolveBasePath } from './core/holidays.js';
import { autoInitWrappers, readDateOptions } from './core/auto-init.js';

export class DatePicker extends PickerCore {
    static instances = [];

    constructor(wrapper, options = {}) {
        super(wrapper, { ...options, mode: 'date' }, { registry: DatePicker, ariaLabel: 'Date Picker' });
    }
}

// Auto-initialization
if (typeof document !== 'undefined') {
    autoInitWrappers(DatePicker, readDateOptions, resolveBasePath(document));
}
