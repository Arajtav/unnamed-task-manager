import { For } from "solid-js";
import { fn } from "storybook/test";
import { InfoIcon, OctagonXIcon, TriangleAlertIcon, BellIcon, SaveCheckIcon } from "lucide-solid";
import Alert from "./Alert";
import { Meta, StoryObj } from "storybook-solidjs-vite";

const icons = { InfoIcon, OctagonXIcon, TriangleAlertIcon, BellIcon };

const meta = {
    title: "Components/Alert",
    component: Alert,
    tags: ["autodocs"],
    parameters: { layout: "centered" },
    argTypes: {
        type: {
            control: "select",
            options: ["info", "success", "warning", "error"],
        },
        icon: {
            control: "select",
            options: Object.keys(icons),
            mapping: icons,
        },
        title: { control: "text" },
        content: { control: "text" },
        buttons: { control: "object" },
        onClose: { action: "close" },
    },
    args: {
        onClose: fn(),
        title: "Title",
        content: "This is an alert message.",
        icon: InfoIcon,
        type: "normal",
        buttons: [],
    },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = {
    args: {
        type: "normal",
        icon: SaveCheckIcon,
        title: "Task saved",
        content: "Your changes have been saved successfully.",
    },
};

export const Warning: Story = {
    args: {
        type: "warning",
        icon: TriangleAlertIcon,
        title: "Unsaved changes",
        content: "You have unsaved changes that will be lost if you leave.",
        buttons: [
            { name: "Discard", onClick: fn(), important: false },
            { name: "Keep editing", onClick: fn(), important: true },
        ],
    },
};

export const Error: Story = {
    args: {
        type: "error",
        icon: OctagonXIcon,
        title: "Deletion failed",
        content: "Could not delete the board. Please try again later.",
        buttons: [{ name: "Retry", onClick: fn(), important: true }],
    },
};

export const SingleButton: Story = {
    args: {
        buttons: [{ name: "Got it", onClick: fn(), important: false }],
    },
};

export const ManyButtons: Story = {
    args: {
        icon: BellIcon,
        title: "New notification",
        content: "You were assigned to task T123.",
        buttons: [
            { name: "And?", onClick: fn(), important: false },
            { name: "View", onClick: fn(), important: true },
            { name: "Pretend you don't see it", onClick: fn(), important: true },
        ],
    },
};

export const LongContent: Story = {
    args: {
        title: "A very long title that or something, that hopefully shows the text wraps",
        content:
            "mrrupp mew mreow row miiiau mrow mrrp mrrroow mrrp mrrp. mrrrp mrrroow mrrrau mauw meow mrreeoww mrrp mew meow purrrrrrrrrr. mauw meow mauw meow row meow meow mrow mrrrau! mrauwr row mreow mrrrp meow mrrroow mrrp meow mauw meow meow mrow. mew mrrp mrow mrow miiiau mrrupp row mreow :3",
        buttons: [{ name: "Accept", onClick: fn(), important: false }],
    },
};

export const AllTypes: Story = {
    render: args => (
        <div class="flex flex-col flex-wrap gap-4">
            <For each={[
                    ["normal", InfoIcon],
                    ["warning", TriangleAlertIcon],
                    ["error", OctagonXIcon],
                ] as const}>{([type, icon]) => (
                <Alert {...args} type={type} icon={icon} title={type} />
            )}</For>
        </div>
    ),
};
