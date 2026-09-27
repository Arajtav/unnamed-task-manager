import { Client, cacheExchange, fetchExchange } from "@urql/core";

export const gqlClient = new Client({
    url: `${import.meta.env.VITE_BACKEND}/graphql`,
    exchanges: [cacheExchange, fetchExchange],
    preferGetMethod: false,
    fetchOptions: {
        credentials: "include",
    },
});
