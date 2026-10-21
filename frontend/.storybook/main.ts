import type { StorybookConfig } from "storybook-solidjs-vite";

const config: StorybookConfig = {
    framework: "storybook-solidjs-vite",
    stories: ["../src/**/*.stories.@(ts|tsx)"],
    addons: [],
};

export default config;
