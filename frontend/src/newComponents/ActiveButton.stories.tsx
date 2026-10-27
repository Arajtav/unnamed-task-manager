import type { Meta, StoryObj } from "storybook-solidjs-vite";
import ActiveButton from "./ActiveButton";
import { ChevronRightIcon, KeyRoundIcon, SaveIcon, TrashIcon } from "lucide-solid";
import { fn } from "storybook/test";
import { createSignal } from "solid-js";

const icons = { ChevronRightIcon, KeyRoundIcon, SaveIcon, TrashIcon };

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
        isLoading: {
            control: "boolean",
        },
        disabled: {
            control: "boolean",
        },
    },
    args: {
        text: "A button",
        icon: ChevronRightIcon,
        onClick: fn(),
        isLoading: false,
        disabled: false,
    },
} satisfies Meta<typeof ActiveButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LoadingStatic: Story = {
    args: {
        isLoading: true,
    },
};

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

export const Disabled: Story = {
    args: {
        disabled: true,
    },
};

export const DisabledAndLoading: Story = {
    args: {
        disabled: true,
        isLoading: true,
    },
};

export const ShortText: Story = {
    args: {
        text: "Go",
    },
};

export const LoadingThenDisabled: Story = {
    render: args => {
        const [loading, setLoading] = createSignal(false);
        const [done, setDone] = createSignal(false);

        const handleClick = (e: MouseEvent) => {
            args.onClick(e);
            setLoading(true);

            setTimeout(() => {
                setLoading(false);
                setDone(true);
            }, 2000);
        };

        return (
            <ActiveButton
                text={done() ? "Saved" : "Save"}
                icon={SaveIcon}
                isLoading={loading()}
                disabled={done()}
                onClick={handleClick}
            />
        );
    },
};

/** All states side by side for quick visual comparison. */
export const AllStates: Story = {
    render: args => (
        <div class="flex flex-col gap-4">
            <ActiveButton {...args} text="Normal" />
            <ActiveButton {...args} text="Loading" isLoading={true} />
            <ActiveButton {...args} text="Disabled" disabled={true} />
            <ActiveButton {...args} text="Disabled + loading" disabled={true} isLoading={true} />
        </div>
    ),
};
