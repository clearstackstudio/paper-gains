import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [
    // `light:` variant — applies under prefers-color-scheme: light.
    // Default (unprefixed) styles are the dark theme; `light:` overrides
    // switch the palette for light-mode users. No toggle, OS-driven only.
    plugin(({ addVariant }) => {
      addVariant("light", "@media (prefers-color-scheme: light)");
    }),
  ],
};

export default config;
