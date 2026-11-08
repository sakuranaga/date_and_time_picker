/* Node module hook: the picker sources `import './xxx.css'` for the Rollup bundle (rollup-plugin-postcss).
   Node cannot load CSS, so in tests every .css import becomes an empty module. */

export async function load(url, context, nextLoad) {
    if (new URL(url).pathname.endsWith('.css')) {
        return { format: 'module', source: '', shortCircuit: true };
    }
    return nextLoad(url, context);
}
