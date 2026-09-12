import { RouteSectionProps } from "@solidjs/router";
import Breadcrumbs from "./Breadcrumbs";
import Dock from "./Dock";

export default function Layout(props: RouteSectionProps) {
    return (
        <div class="bg-neutral">
            <Breadcrumbs />
            {props.children}
            <Dock />
        </div>
    );
}
