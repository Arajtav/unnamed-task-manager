import Drawer from "./Drawer";
import Breadcrumbs from "./Breadcrumbs";
import MeIcon from "./MeIcon";

export default function Navbar() {
    return (
        <div class="navbar flex flex-row justify-between bg-base-100">
            <div class="flex flex-row gap-4">
                <Drawer />
                <Breadcrumbs />
            </div>
            <MeIcon />
        </div>
    );
}
