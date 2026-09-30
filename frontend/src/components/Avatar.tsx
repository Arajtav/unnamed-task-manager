export default function Avatar({ user, alt }: { user: string; alt?: string }) {
    return (
        <div class="avatar avatar-placeholder" title={alt ?? user}>
            <div class="w-7 aspect-square rounded-full bg-primary flex items-center justify-center capitalize">
                <span>{user.charAt(0)}</span>
            </div>
        </div>
    );
}
