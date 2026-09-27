import Drawer from "./Drawer";
import Breadcrumbs from "./Breadcrumbs";
import Avatar from "./Avatar";
import { useMe } from "./Layout";

export default function Navbar() {
    let [me] = useMe();

    return (
        <div class="navbar flex flex-row justify-between h-10 bg-base-100">
            <div class="flex flex-row gap-4">
                <Drawer />
                <Breadcrumbs />
            </div>
            <Avatar user={me} />
        </div>
    );
}
