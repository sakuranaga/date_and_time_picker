/* ----------------------------------------------------------
   core/time-utils.js : pure time helpers shared by the pickers
---------------------------------------------------------- */

/** '00' .. '23' */
export const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

/** The minute values from 0 in steps of `step`, below 60. */
export function minuteValues(step) {
    const minutes = [];
    for (let i = 0; i < 60; i += step) {
        minutes.push(i.toString().padStart(2, '0'));
    }
    return minutes;
}

/**
 * The time of `now` with its minute rounded to the nearest step: { hour, minute } as 2-digit strings.
 * Rounding up to :60 carries into the next hour (23:xx carries to 00). The minute is always one of minuteValues(step).
 */
export function nearestTime(now, step) {
    let hour = now.getHours();
    let minute = Math.round(now.getMinutes() / step) * step;
    if (minute >= 60) {
        minute = 0;
        hour = (hour + 1) % 24;
    }
    return { hour: hour.toString().padStart(2, '0'), minute: minute.toString().padStart(2, '0') };
}

/**
 * DateTimePicker's reading of an input value: 'time' finds the first HH:mm, 'datetime' needs HH:mm at the end.
 * @returns {{ hour: string, minute: string } | null}
 */
export function matchTimeValue(value, mode) {
    const pattern = mode === 'datetime' ? /(\d{2}):(\d{2})$/ : /(\d{2}):(\d{2})/;
    const match = value.match(pattern);
    return match ? { hour: match[1], minute: match[2] } : null;
}

/** TimePicker's reading of an input value: the parts around ':' (hour first, minute second). */
export function splitTimeValue(value) {
    return value.split(':');
}
