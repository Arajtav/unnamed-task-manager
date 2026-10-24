import { LoaderIcon } from "lucide-solid";

export default function LoadingSpinner() {
    return (
        <div class="animate-spin" style={{"animation-duration": "2s"}}>
            <LoaderIcon />
        </div>
    );
}
