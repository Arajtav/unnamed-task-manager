import type { Meta, StoryObj } from "storybook-solidjs-vite";
import ActiveButton from "./ActiveButton";
import { ChevronRightIcon, KeyRoundIcon } from "lucide-solid";
import { fn } from "storybook/test";
import { createSignal } from "solid-js";

const icons = { ChevronRightIcon, KeyRoundIcon };

const meta = {
    title: "Components/ActiveButton",
    component: ActiveButton,
    tags: ["autodocs"],
    parameters: { layout: "centered" },
    argTypes: {
        text: {
            control: "text",
        },
        icon: {
            control: "select",
            options: Object.keys(icons),
            mapping: icons,
        },
    },
    args: {
        text: "A button",
        icon: ChevronRightIcon,
        onClick: fn(),
        isLoading: false,
    },
} satisfies Meta<typeof ActiveButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
    render: args => {
        const [loading, setLoading] = createSignal(args.isLoading);

        const handleClick = (e: MouseEvent) => {
            args.onClick(e);

            if (loading()) return;

            setLoading(true);

            setTimeout(() => {
                setLoading(false);
            }, 3000);
        };

        return (
            <ActiveButton
                text="Login with a passkey"
                icon={args.icon}
                isLoading={loading()}
                onClick={handleClick}
            />
        );
    },
    args: {
        icon: KeyRoundIcon,
    },
};
