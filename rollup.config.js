import resolve from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';

export default [
    // DatePicker bundle
    {
        input: 'datepicker.js',
        output: {
            file: 'dist/datepicker.js',
            format: 'iife',
            name: 'DatePicker',
            banner: '/* Date Picker - Bundled with Rollup */',
            extend: true,
        },
        plugins: [
            postcss({
                inject: true, // Inject CSS into JS
                minimize: true,
            }),
            resolve(),
        ],
    },
    // TimePicker bundle
    {
        input: 'timepicker.js',
        output: {
            file: 'dist/timepicker.js',
            format: 'iife',
            name: 'TimePicker',
            banner: '/* Time Picker - Bundled with Rollup */',
            extend: true,
        },
        plugins: [
            postcss({
                inject: true, // Inject CSS into JS
                minimize: true,
            }),
            resolve(),
        ],
    },
];
