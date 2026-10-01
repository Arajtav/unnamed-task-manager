import Drawer from "./Drawer";
import Breadcrumbs from "./Breadcrumbs";
import { useMe } from "./Layout";
import AvatarWithSettings from "./MainAvatar";

export default function Navbar() {
    let [me] = useMe();

    return (
        <div class="navbar flex flex-row justify-between bg-base-100">
            <div class="flex flex-row gap-4">
                <Drawer />
                <Breadcrumbs />
            </div>
            <AvatarWithSettings user={me.handle ?? me.emails[0] ?? me.id} />
        </div>
    );
}
