import { createContext, createRoot, useContext } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { makePersisted, storageSync } from "@solid-primitives/storage";

// TODO: Surely this can be simpler

type Entries = Record<string, unknown>;

function createEntries(name: string) {
    const [store, setStore] = createRoot(() =>
        makePersisted(createStore<Entries>({}) as [unknown, SetStoreFunction<unknown>], {
            name,
            sync: storageSync,
        })
    ) as ReturnType<typeof createStore<Entries>>;

    return {
        get: <T>(key: string) => store[key] as T | undefined,
        set: <T>(key: string, value: T | undefined) => setStore(key, value),
        remove: (key: string) => setStore(key, undefined),
        keys: (prefix = "") => Object.keys(store).filter(key => key.startsWith(prefix)),
    };
}

export function createClientAppData(userId: string) {
    return {
        global: createEntries("clientAppData"),
        user: createEntries(`${userId}:clientAppData`),
    };
}

type ClientAppDataStore = ReturnType<typeof createClientAppData>;

export const ClientAppDataContext = createContext<ClientAppDataStore>();

function useClientAppData() {
    const context = useContext(ClientAppDataContext);

    if (!context) {
        throw new Error("useClientAppData must be used inside the ClientAppDataContext.Provider");
    }

    return context;
}

export const useGlobalAppData = () => useClientAppData().global;
export const useUserAppData = () => useClientAppData().user;

const TT_PREFIX = "tt:";

export function useTimeTracking() {
    const user = useUserAppData();

    const key = (taskId: number) => `${TT_PREFIX}${taskId}`;

    return {
        start: (taskId: number) => {
            user.set(key(taskId), new Date().toISOString());
        },
        clear: (taskId: number) => user.remove(key(taskId)),
        startedAt: (taskId: number) => {
            const value = user.get<string>(key(taskId));
            return value === undefined ? undefined : new Date(value);
        },
        isTracking: (taskId: number) => user.get<string>(key(taskId)) !== undefined,
        trackedTaskIds: () => user.keys(TT_PREFIX).map(k => Number(k.slice(TT_PREFIX.length))),
        tracked: () =>
            user.keys(TT_PREFIX).map(k => ({
                taskId: Number(k.slice(TT_PREFIX.length)),
                startedAt: new Date(user.get<string>(k)!),
            })),
    };
}
