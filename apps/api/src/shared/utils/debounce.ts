/**
 * A debounce with a floor, keyed per subject.
 *
 * The debounce half waits for quiet: every call resets the timer, so work runs
 * once activity stops rather than once per event. That is the opposite of
 * throttleByKey in realtime/throttle.ts, which fires immediately and is right
 * for broadcasting a change other clients should see now.
 *
 * The floor half is a cooldown. Waiting for quiet still fires on every pause,
 * and someone who thinks for six seconds between sentences would trigger work on
 * each one. With a floor, a run scheduled too soon after the last simply waits
 * out the remainder — nothing is dropped, the pending work merges into the next
 * permitted run, which acts on the newest state by then.
 *
 * In memory, so it is per-process and lost on restart. That is why it is an
 * optimisation and never the guarantee: something durable has to catch what it
 * misses.
 */
export type Debouncer = {
    schedule: (key: string) => void;
    cancel: (key: string) => void;
    pending: () => number;
};

type DebouncerOptions = {
    waitMs: number;
    floorMs: number;
    run: (key: string) => Promise<unknown>;
    onError?: (key: string, error: unknown) => void;
};

export function createDebouncer({ waitMs, floorMs, run, onError }: DebouncerOptions): Debouncer {
    const timers = new Map<string, NodeJS.Timeout>();
    const lastRunAt = new Map<string, number>();

    /** Entries older than the floor no longer constrain anything. */
    function prune(now: number) {
        for (const [key, at] of lastRunAt) {
            if (now - at > floorMs) lastRunAt.delete(key);
        }
    }

    function schedule(key: string) {
        const existing = timers.get(key);
        if (existing) clearTimeout(existing);

        const now = Date.now();
        const sinceLastRun = now - (lastRunAt.get(key) ?? -Infinity);
        const cooldownLeft = Math.max(0, floorMs - sinceLastRun);

        const timer = setTimeout(
            () => {
                timers.delete(key);

                const ranAt = Date.now();
                lastRunAt.set(key, ranAt);
                if (lastRunAt.size > 500) prune(ranAt);

                void run(key).catch((error: unknown) => onError?.(key, error));
            },
            Math.max(waitMs, cooldownLeft),
        );

        // Never hold the process open; a pending embed is not worth delaying a
        // shutdown for, and the worker will pick the note up regardless.
        timer.unref();

        timers.set(key, timer);
    }

    function cancel(key: string) {
        const existing = timers.get(key);

        if (existing) {
            clearTimeout(existing);
            timers.delete(key);
        }
    }

    return { schedule, cancel, pending: () => timers.size };
}
