// Tested, it could be better with actual curvature and hue dependent changes.
export const textColor = (color: string) =>
    `oklch(from ${color} clamp(0, calc((0.7 + (1.08 - 0.7) * l / 0.535) * (1 - max(0, sign(l - 0.535))) + (-0.26 + (0.44 - -0.26) * (l - 0.535) / (1 - 0.535)) * max(0, sign(l - 0.535))), 1) calc(min(c, 0.12)) h)`;
