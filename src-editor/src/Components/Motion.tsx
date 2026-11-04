/**
 * Small animations of the editor: elements grow to their width or height when they appear and shrink when
 * they go, colors fade, badges jump. They complement the animated icons of `@iobroker/gui-components`
 * (`IconPlayPause`, `IconRefresh`, `IconTrash`...).
 *
 * Everything runs with the Web Animations API or with CSS, without an animation library. If the user asked
 * the system for less motion, nothing moves: the elements appear and disappear at once, and the callbacks
 * are called right away.
 */
import React, { useEffect, useLayoutEffect, useRef } from 'react';

import { Badge, type BadgeProps } from '@mui/material';

const EASING = 'cubic-bezier(0.2, 0, 0, 1)';

const STYLE_ID = 'iob-js-motion';

/** Animations that need no JavaScript; the classes are given to the elements that should move */
const styles = `
/* pops up, e.g. the sign of a changed script in its tab */
.iob-js-pop { animation: iob-js-pop 0.35s cubic-bezier(0.3, 1.5, 0.6, 1); }
/* a new line of the log: it slides in and lights up for a moment */
.iob-js-log-line { animation: iob-js-log-in 0.5s ease-out; }
/* colors fade into the new one, e.g. the start/stop button of a script */
.iob-js-color-fade { transition: color 0.4s ease, background-color 0.4s ease; }
/* a new script or folder in the list lights up for a moment */
.iob-js-fresh { animation: iob-js-fresh 1.6s ease-out; }
/* turns back once, like a clock that is set back - the symbol of the history */
.iob-js-rewind { animation: iob-js-rewind 0.8s cubic-bezier(0.2, 0, 0, 1); }

@keyframes iob-js-pop { from { scale: 0.3; opacity: 0; } 60% { scale: 1.25; opacity: 1; } to { scale: 1; } }
@keyframes iob-js-log-in { from { opacity: 0; translate: 0 6px; filter: brightness(1.5); } }
@keyframes iob-js-fresh { from { background-color: rgba(76, 175, 80, 0.45); } }
@keyframes iob-js-rewind { from { rotate: 360deg; } }

@media (prefers-reduced-motion: reduce) {
    .iob-js-pop, .iob-js-log-line, .iob-js-fresh, .iob-js-rewind { animation: none; }
    .iob-js-color-fade { transition: none; }
}
`;

if (typeof window !== 'undefined' && window.document && !window.document.getElementById(STYLE_ID)) {
    const style = window.document.createElement('style');
    style.setAttribute('id', STYLE_ID);
    style.innerHTML = styles;
    window.document.head.appendChild(style);
}

/** True if the user asked the system for less motion */
export function prefersReducedMotion(): boolean {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function canAnimate(element: Element | null | undefined): element is HTMLElement {
    return !!element && typeof (element as HTMLElement).animate === 'function' && !prefersReducedMotion();
}

/** `x`: the width grows or shrinks, `y`: the height */
export type Axis = 'x' | 'y';

const PROPERTIES: Record<Axis, { size: 'width' | 'height'; min: 'minWidth' | 'minHeight'; sides: [string, string] }> = {
    x: { size: 'width', min: 'minWidth', sides: ['Left', 'Right'] },
    y: { size: 'height', min: 'minHeight', sides: ['Top', 'Bottom'] },
};

/**
 * The key frames of the element at its full size and at zero: along the axis the size, the minimal size, the
 * paddings, the margins and the borders. null if the element has no size (not rendered).
 */
function frames(element: HTMLElement, axis: Axis): { full: Keyframe; zero: Keyframe } | null {
    const computed = window.getComputedStyle(element);
    const { size, min, sides } = PROPERTIES[axis];
    if (!computed[size].endsWith('px')) {
        return null;
    }
    // `min-width: auto` of a flex item would keep the element at the width of its content
    const minSize = computed[min].endsWith('px') ? computed[min] : '0px';
    const full: Keyframe = { [size]: computed[size], [min]: minSize, opacity: computed.opacity };
    const zero: Keyframe = { [size]: '0px', [min]: '0px', opacity: 0 };
    for (const side of sides) {
        for (const property of [`padding${side}`, `margin${side}`, `border${side}Width`]) {
            full[property] = computed.getPropertyValue(property.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`));
            zero[property] = '0px';
        }
    }
    return { full, zero };
}

/**
 * While an element grows or shrinks, its content is cut off at its border, and a text in it does not wrap.
 * Several animations of one element can overlap, so the original inline styles are kept until the last ends.
 */
const clipped = new WeakMap<HTMLElement, { count: number; overflow: string; whiteSpace: string }>();

function run(element: HTMLElement, axis: Axis, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation {
    let info = clipped.get(element);
    if (!info) {
        info = { count: 0, overflow: element.style.overflow, whiteSpace: element.style.whiteSpace };
        clipped.set(element, info);
        element.style.overflow = 'hidden';
        if (axis === 'x') {
            element.style.whiteSpace = 'nowrap';
        }
    }
    info.count++;
    const animation = element.animate(keyframes, options);
    let ended = false;
    const restore = (): void => {
        if (ended) {
            return;
        }
        ended = true;
        const current = clipped.get(element);
        if (current && !--current.count) {
            clipped.delete(element);
            element.style.overflow = current.overflow;
            element.style.whiteSpace = current.whiteSpace;
        }
    };
    animation.addEventListener('finish', restore);
    animation.addEventListener('cancel', restore);
    return animation;
}

export interface GrowOptions {
    /** In ms, default 260 */
    duration?: number;
    /** In ms, default 0. Until then, the element has no size. */
    delay?: number;
}

/** The element just appeared: it grows from nothing to its width (`x`) or height (`y`) */
export function growIn(element: HTMLElement | null | undefined, axis: Axis, options?: GrowOptions): Animation | null {
    if (!canAnimate(element)) {
        return null;
    }
    const sizes = frames(element, axis);
    if (!sizes) {
        return null;
    }
    return run(element, axis, [sizes.zero, sizes.full], {
        duration: options?.duration ?? 260,
        delay: options?.delay ?? 0,
        easing: EASING,
        fill: 'backwards',
    });
}

/**
 * The elements shrink to nothing along the axis, then `onFinished` is called - once, also if nothing can be
 * animated (then at once). The elements stay at zero until the caller removed them or canceled the returned
 * animations: cancel them after the elements are gone, otherwise elements, which are still there, stay
 * invisible.
 */
export function shrinkOut(
    elements: (HTMLElement | null | undefined)[],
    axis: Axis,
    onFinished: () => void,
    options?: GrowOptions,
): Animation[] {
    const animations: Animation[] = [];
    for (const element of elements) {
        if (!canAnimate(element)) {
            continue;
        }
        const sizes = frames(element, axis);
        if (sizes) {
            animations.push(
                run(element, axis, [sizes.full, sizes.zero], {
                    duration: options?.duration ?? 200,
                    delay: options?.delay ?? 0,
                    easing: EASING,
                    fill: 'forwards',
                }),
            );
        }
    }
    if (!animations.length) {
        onFinished();
    } else {
        let called = false;
        const done = (): void => {
            if (!called) {
                called = true;
                onFinished();
            }
        };
        // all animations have the same duration; if one is canceled, the others end anyway
        animations[0].addEventListener('finish', done);
        animations[0].addEventListener('cancel', done);
    }
    return animations;
}

/**
 * The element just changed its size, e.g. a dialog that was maximized: it grows (or shrinks) from the old size
 * to the new one. Only the width and the height are animated; the maximal sizes are lifted meanwhile, so that
 * a dialog with `maxWidth` can come down from the whole screen.
 *
 * @param element The element with its new size
 * @param from The size before the change (`getBoundingClientRect()` before it)
 */
export function resizeFrom(
    element: HTMLElement | null | undefined,
    from: DOMRect | null | undefined,
    duration = 280,
): Animation | null {
    if (!from || !canAnimate(element)) {
        return null;
    }
    const to = element.getBoundingClientRect();
    if (Math.abs(to.width - from.width) < 2 && Math.abs(to.height - from.height) < 2) {
        return null;
    }
    const unlimited = { maxWidth: 'none', maxHeight: 'none', boxSizing: 'border-box' };
    return run(
        element,
        'y',
        [
            { width: `${from.width}px`, height: `${from.height}px`, ...unlimited },
            { width: `${to.width}px`, height: `${to.height}px`, ...unlimited },
        ],
        { duration, easing: EASING },
    );
}

const REVEAL_FROM: Record<'left' | 'right' | 'top' | 'bottom', string> = {
    left: 'inset(0 100% 0 0)',
    right: 'inset(0 0 0 100%)',
    top: 'inset(0 0 100% 0)',
    bottom: 'inset(100% 0 0 0)',
};

/**
 * The element is uncovered from one side, e.g. a panel that was opened at the left or at the bottom. Only
 * `clip-path` is animated, so the layout has its end state at once (no resize of an editor next to it).
 */
export function reveal(
    element: HTMLElement | null | undefined,
    from: 'left' | 'right' | 'top' | 'bottom',
    duration = 320,
): Animation | null {
    if (!canAnimate(element)) {
        return null;
    }
    return element.animate(
        [
            { clipPath: REVEAL_FROM[from], opacity: 0.4 },
            { clipPath: 'inset(0 0 0 0)', opacity: 1 },
        ],
        { duration, easing: EASING },
    );
}

/** The elements grow from nothing along the axis, all at the same time - e.g. the rows of an opened folder */
export function growAllIn(
    elements: (HTMLElement | null | undefined)[],
    axis: Axis,
    options?: GrowOptions,
): Animation[] {
    return elements.map(element => growIn(element, axis, options)).filter((a): a is Animation => !!a);
}

const BOUNCE_ID = 'iob-js-bounce';

/** The element jumps, e.g. a badge whose number grew. Animates `scale`, so a `transform` of the element stays. */
export function bounce(element: HTMLElement | null | undefined): void {
    // many new log lines must not let the badge jump all the time
    if (!canAnimate(element) || element.getAnimations?.().some(anim => anim.id === BOUNCE_ID)) {
        return;
    }
    const animation = element.animate([{ scale: 1 }, { scale: 1.5 }, { scale: 0.85 }, { scale: 1.12 }, { scale: 1 }], {
        duration: 650,
        easing: 'ease-out',
    });
    animation.id = BOUNCE_ID;
}

/** The background of the element lights up in `color` and fades back into its own color */
export function flash(element: HTMLElement | null | undefined, color: string, duration = 1200): void {
    if (canAnimate(element)) {
        // the end is the own color of the element, also if it changes meanwhile
        element.animate([{ backgroundColor: color, offset: 0 }], { duration, easing: 'ease-out' });
    }
}

/**
 * Wraps its children; they grow from nothing to their width (`axis="x"`, default) or height when they appear,
 * e.g. a button that is shown only for a changed script.
 */
export function GrowIn(props: {
    axis?: Axis;
    delay?: number;
    duration?: number;
    style?: React.CSSProperties;
    className?: string;
    title?: string;
    children: React.ReactNode;
}): React.JSX.Element {
    const ref = useRef<HTMLSpanElement>(null);
    const axis = props.axis || 'x';
    useLayoutEffect(() => {
        const animation = growIn(ref.current, axis, { delay: props.delay, duration: props.duration });
        return () => animation?.cancel();
        // only when it appears
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
        <span
            ref={ref}
            className={props.className}
            title={props.title}
            style={{
                display: axis === 'x' ? 'inline-flex' : 'flex',
                alignItems: 'center',
                flexShrink: 0,
                ...props.style,
            }}
        >
            {props.children}
        </span>
    );
}

/** MUI `Badge`, which jumps when its number grows */
export function BouncingBadge(props: BadgeProps): React.JSX.Element {
    const ref = useRef<HTMLSpanElement>(null);
    const count = typeof props.badgeContent === 'number' ? props.badgeContent : 0;
    const last = useRef(count);
    useEffect(() => {
        const previous = last.current;
        last.current = count;
        if (count > previous) {
            // `scale` and not `transform`, which MUI uses to place the badge
            bounce(ref.current?.querySelector<HTMLElement>('.MuiBadge-badge'));
        }
    }, [count]);
    return (
        <Badge
            ref={ref}
            {...props}
        />
    );
}
