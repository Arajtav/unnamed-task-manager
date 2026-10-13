import { Client, cacheExchange, fetchExchange, mapExchange } from "@urql/core";
import { print } from "graphql";

const LoggerExchange = mapExchange({
    onOperation(operation) {
        console.debug(print(operation.query));
    },
});

export const gqlClient = new Client({
    url: `${import.meta.env.VITE_BACKEND}/graphql`,
    exchanges: [LoggerExchange, cacheExchange, fetchExchange],
    preferGetMethod: false,
    fetchOptions: {
        credentials: "include",
    },
});
