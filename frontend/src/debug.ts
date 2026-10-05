// TODO: well I mean why did I even use json...
// This was meant to be like RUST's `dbg!`.
export function dbg<T>(value: T): T {
    const file = new Error().stack?.split("\n")[1].split("@")[1];

    const seen = new WeakSet<object>();

    function unwrap(value: any): Object {
        // Why is null an object what.
        if (typeof value != "object" || value === null) {
            return value;
        }

        if (seen.has(value)) {
            return "[Circular Reference]";
        }

        seen.add(value);

        if (Array.isArray(value)) {
            return value.map(unwrap);
        }

        if (value instanceof Set) {
            return {
                "[[Set]]": [...value].map(unwrap),
            };
        }

        if (value instanceof Map) {
            return {
                "[[Map]]": [...value.entries()].map(([key, val]) => [unwrap(key), unwrap(val)]),
            };
        }

        return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, unwrap(val)]));
    }

    console.log(`[${file}] X =`, JSON.stringify(unwrap(value), null, 2));

    return value;
}

export function todo(s?: string): any {
    console.error(`not yet implemented${s ? ": " + s : ""}`);
}
