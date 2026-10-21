export type Replace<T, K extends keyof T, V> = Omit<T, K> & Record<K, V>;

export function doIfNotNull<T, D>(value: T | null, fn: (arg: T) => D): D | null {
    if (value !== null) {
        return fn(value);
    } else {
        return null;
    }
}
