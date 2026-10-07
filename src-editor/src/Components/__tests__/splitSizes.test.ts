import { describe, it, expect, beforeEach } from 'vitest';

import { SplitSizes } from '../splitSizes';

/**
 * Builds the DOM a `@devbookhq/splitter` leaves behind: a root with two panes sized in percent
 * and the gutter between them, carrying the marker class.
 *
 * @param marker the marker class the splitter was given
 * @param a size of the first pane in percent
 * @param b size of the second pane in percent
 * @param prop whether the splitter lays its panes out horizontally or vertically
 */
function mountSplitter(marker: string, a: number, b: number, prop: 'width' | 'height' = 'width'): void {
    document.body.innerHTML = `
        <div id="root">
            <div style="${prop}: calc(${a}% - 4px)"></div>
            <div class="__dbk__gutter Horizontal Dark visGutter ${marker}" style="${prop}: 8px"></div>
            <div style="${prop}: calc(${b}% - 4px)"></div>
        </div>`;
}

describe('SplitSizes', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('puts its marker on the gutter class so the panes can be found again', () => {
        const split = new SplitSizes('demo');
        expect(split.gutterClassName('dark')).toBe('Dark visGutter js-split-demo');
        expect(split.gutterClassName('light')).toBe('Light visGutter js-split-demo');
    });

    it('falls back to the given sizes while the splitter is not mounted', () => {
        const split = new SplitSizes('demo');
        expect(split.current([20, 80])).toEqual([20, 80]);
    });

    it('hands out the same array every time, so the splitter stops re-applying it', () => {
        const split = new SplitSizes('demo');
        const first = split.current([20, 80]);
        const second = split.current([20, 80]);
        expect(second).toBe(first);
    });

    it('prefers the sizes the panes actually have over the given ones', () => {
        const split = new SplitSizes('demo');
        split.current([20, 80]);
        // what a drag leaves behind - the stored value is still the old one
        mountSplitter('js-split-demo', 35, 65);
        expect(split.current([20, 80])).toEqual([35, 65]);
    });

    it('reads a vertical splitter by height', () => {
        const split = new SplitSizes('demo');
        mountSplitter('js-split-demo', 55, 45, 'height');
        expect(split.current([80, 20])).toEqual([55, 45]);
    });

    it('ignores a splitter whose panes do not match the expected count', () => {
        const split = new SplitSizes('demo');
        document.body.innerHTML = `
            <div id="root">
                <div style="width: calc(50% - 4px)"></div>
                <div class="visGutter js-split-demo" style="width: 8px"></div>
            </div>`;
        expect(split.current([20, 80])).toEqual([20, 80]);
    });

    it('does not pick up the panes of another splitter', () => {
        const split = new SplitSizes('mine');
        document.body.innerHTML = `
            <div>
                <div style="width: calc(11% - 4px)"></div>
                <div class="visGutter js-split-other" style="width: 8px"></div>
                <div style="width: calc(89% - 4px)"></div>
            </div>`;
        expect(split.current([20, 80])).toEqual([20, 80]);
    });

    it('takes the sizes of a finished drag before the next render can read the DOM', () => {
        const split = new SplitSizes('demo');
        const sizes = split.current([20, 80]);
        split.update([42, 58]);
        // same array, new content - the splitter keeps the object it was handed
        expect(sizes).toEqual([42, 58]);
    });
});
