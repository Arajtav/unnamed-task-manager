// Of course safari is behind...
import { Temporal } from "temporal-polyfill/full";

import ColorHash from "color-hash";

export function formatDuration(seconds: number) {
    if (seconds <= 0) {
        return "None";
    }

    const duration = Temporal.Duration.from({ seconds }).round({ largestUnit: "hour" });

    if (duration.total("minutes") < 1) {
        return `${duration.seconds}s`;
    }

    if (duration.total("hours") < 1) {
        return `${duration.minutes}m`;
    }

    return `${duration.hours}h ${duration.minutes}m`;
}

const colorHash = new ColorHash({
    saturation: 0.75,
    lightness: [0.6, 0.65, 0.7],
});

export function userColor(id?: string | null) {
    if (!id) return "#6F6F6F";
    return colorHash.hex(id);
}
