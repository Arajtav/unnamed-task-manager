import ColorHash from "color-hash";

const colorHash = new ColorHash({
    saturation: 0.75,
    lightness: [0.6, 0.65, 0.7],
});

export function userColor(id?: string | null) {
    if (!id) return "#6F6F6F";
    return colorHash.hex(id);
}

export function boardColor(id?: number | null) {
    if (!id) return "#6F6F6F";
    return colorHash.hex(String(id));
}
