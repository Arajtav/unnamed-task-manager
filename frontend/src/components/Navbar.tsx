import Drawer from "./Drawer";
import Breadcrumbs from "./Breadcrumbs";
import Avatar from "./Avatar";

export default function Navbar() {
    return (
        <div class="navbar flex flex-row justify-between h-10 bg-base-100">
            <div class="flex flex-row gap-4">
                <Drawer />
                <Breadcrumbs />
            </div>
            <Avatar />
        </div>
    );
}
