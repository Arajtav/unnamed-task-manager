export default function Email({ email }: { email: string }) {
    let at = email.lastIndexOf("@");

    return (
        <div>
            <span>{email.slice(0, at)}</span>
            <span class="opacity-60">{" @ " + email.slice(at + 1)}</span>
        </div>
    );
}
