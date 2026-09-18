import { GqlUser } from "../graphql/types";
import Drawer from "./Drawer";
import Breadcrumbs from "./Breadcrumbs";
import Avatar from "./Avatar";

export default function Navbar(props: { me: GqlUser }) {
    return (
        <div class="navbar flex flex-row justify-between h-10 bg-base-100">
            <div class="flex flex-row gap-4">
                <Drawer />
                <Breadcrumbs />
            </div>
            <Avatar me={props.me} />
        </div>
    );
}
