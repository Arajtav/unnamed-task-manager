import { createSignal, onCleanup } from "solid-js";

const [now, setNow] = createSignal(Date.now());
let subscribers = 0;
let interval: ReturnType<typeof setInterval> | undefined;

export function useNow() {
    if (subscribers++ === 0) {
        setNow(Date.now());
        interval = setInterval(() => setNow(Date.now()), 1000);
    }

    onCleanup(() => {
        if (--subscribers === 0) clearInterval(interval);
    });

    return now;
}
