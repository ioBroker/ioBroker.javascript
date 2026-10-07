/**
 * Keeps the column/row sizes of a `@devbookhq/splitter` where the user dragged them.
 *
 * The splitter re-applies `initialSizes` from an effect whose dependencies include its `children`:
 *
 * ```js
 * }), [w, D.isReady, n, P, T, h])   // w = children, h = initialSizes
 * ```
 *
 * In a class component the children are new elements on *every* render, so the effect runs again
 * on every render and pushes the panes back to `initialSizes`. After a finished drag that is
 * invisible, because the stored value is the dragged one by then - but a re-render while the user
 * is still dragging (a log line arriving, a dialog opening, a state update anywhere above) resets
 * the gutter and the drag is lost. That is the "the splitter keeps jumping back" report.
 *
 * This class hands out one array per splitter - the same object on every render, so the dependency
 * stops changing - and refills it with the sizes the panes actually have, read back from the
 * inline `calc(<percent>% - <gutter>px)` the splitter writes. Re-applying it is then a no-op
 * instead of a jump, during a drag as well, because the DOM is ahead of the stored value.
 */
export class SplitSizes {
    /** The array handed to `initialSizes`; its identity never changes */
    private readonly sizes: number[] = [];
    /** Marker class on this splitter's gutter, so its panes can be found again */
    private readonly marker: string;

    /**
     * @param id short name of this splitter, unique within the page
     */
    constructor(id: string) {
        this.marker = `js-split-${id}`;
    }

    /**
     * The value for `gutterClassName`, carrying the marker.
     *
     * @param themeType the current theme, which decides the gutter's own class
     */
    gutterClassName(themeType: 'dark' | 'light'): string {
        return `${themeType === 'dark' ? 'Dark' : 'Light'} visGutter ${this.marker}`;
    }

    /**
     * The array for `initialSizes`: the live pane sizes when the splitter is mounted, the given
     * fallback (usually the value from the state) before that and after a remount.
     *
     * @param fallback sizes to use while the panes cannot be measured
     */
    current(fallback: number[]): number[] {
        const live = this.readLive(fallback.length);
        this.sizes.splice(0, this.sizes.length, ...(live || fallback));
        return this.sizes;
    }

    /**
     * Takes the sizes of a finished drag, so a render that beats the state update does not undo it.
     *
     * @param next the sizes reported by `onResizeFinished`
     */
    update(next: number[]): void {
        this.sizes.splice(0, this.sizes.length, ...next);
    }

    /** The sizes the panes are laid out with right now, or `null` while they cannot be measured */
    private readLive(expected: number): number[] | null {
        const root = document.querySelector(`.${this.marker}`)?.parentElement;
        if (!root) {
            return null;
        }
        const live: number[] = [];
        for (const pane of Array.from(root.children) as HTMLElement[]) {
            // Horizontal splitters size their panes by width, vertical ones by height
            const match = /calc\(([\d.]+)%/.exec(pane.style.width || pane.style.height || '');
            if (match) {
                live.push(parseFloat(match[1]));
            }
        }
        return live.length === expected ? live : null;
    }
}
