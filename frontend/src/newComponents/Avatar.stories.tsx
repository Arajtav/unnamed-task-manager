import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import Avatar, { AvatarSize, sizeClasses } from "./Avatar";

const meta = {
    title: "Components/Avatar",
    component: Avatar,
    args: {
        user: { id: "user-1", emails: ["arajtav@example.org"], handle: "arajtav" },
        title: { option: "auto" },
    },
    render: args => (
        <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
            {Object.keys(sizeClasses).map(size => (
                <Avatar {...args} size={size as AvatarSize} />
            ))}
        </div>
    ),
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};

export const NoHandle: Story = {
    args: {
        user: { id: "this-is-a-real-id", emails: ["handler@example.org"], handle: null },
    },
};

export const NoEmail: Story = {
    args: {
        user: { id: "this-is-not-a-real-id", emails: [], handle: "yes" },
    },
};

export const FromEmail: Story = {
    args: {
        user: {
            email: "example@example.org",
            user: { id: "example-id", handle: "example" },
        },
    },
};

export const FromEmailNoAccount: Story = {
    args: {
        user: { email: "new.person@example.org", user: null },
    },
};

export const NoUser: Story = {
    args: { user: undefined },
};

export const CustomTitle: Story = {
    args: { title: { option: "custom", value: "Some user" } },
};

export const Clickable: Story = {
    args: { onClick: fn() },
};
