const timers = new Map<string, NodeJS.Timeout>();
const pending = new Map<string, () => void>();

function schedule(key: string, windowMs: number) {
    timers.set(
        key,
        setTimeout(() => {
            timers.delete(key);

            const queued = pending.get(key);
            if (!queued) return;

            pending.delete(key);
            queued();

            // Keep the window open while updates are still arriving, so a steady
            // stream emits at the throttle rate rather than on every keystroke.
            schedule(key, windowMs);
        }, windowMs),
    );
}

/**
 * Leading edge plus trailing edge, per key. The first call goes out immediately
 * so a single edit isn't delayed, and anything during the window is coalesced to
 * its latest value and emitted when the window closes — so the final state always
 * reaches viewers, which a leading-only throttle would drop.
 */
export function throttleByKey(key: string, windowMs: number, run: () => void) {
    if (timers.has(key)) {
        pending.set(key, run);
        return;
    }

    run();
    schedule(key, windowMs);
}
