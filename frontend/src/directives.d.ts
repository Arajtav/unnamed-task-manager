import "solid-js";
import type { masked } from "solid-imask";

declare module "solid-js" {
    namespace JSX {
        interface Directives {
            masked: ReturnType<Parameters<typeof masked>[1]>;
        }
    }
}
