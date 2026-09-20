import { useCallback, useEffect, useRef } from "react";

/**
 * Calls `callback` once the caller has been quiet for `delay` ms, and exposes a
 * `flush` for when waiting is no longer appropriate - leaving the screen, say.
 *
 * The callback is held in a ref so a re-render with a fresh closure doesn't
 * restart the timer, which would let a steady stream of keystrokes postpone the
 * save indefinitely.
 */
export function useDebouncedCallback<Args extends unknown[]>(
    callback: (...args: Args) => void,
    delay: number,
) {
    const callbackRef = useRef(callback);

    // Synced in an effect rather than assigned during render - a ref write
    // during render is a side effect, and React Compiler rejects it outright.
    useEffect(() => {
        callbackRef.current = callback;
    });

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingArgsRef = useRef<Args | null>(null);

    const clear = useCallback(() => {
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const schedule = useCallback(
        (...args: Args) => {
            pendingArgsRef.current = args;
            clear();

            timeoutRef.current = setTimeout(() => {
                timeoutRef.current = null;

                const pending = pendingArgsRef.current;
                pendingArgsRef.current = null;

                if (pending) callbackRef.current(...pending);
            }, delay);
        },
        [clear, delay],
    );

    const flush = useCallback(() => {
        const pending = pendingArgsRef.current;

        clear();
        pendingArgsRef.current = null;

        if (pending) callbackRef.current(...pending);
    }, [clear]);

    useEffect(() => clear, [clear]);

    return { schedule, flush };
}
