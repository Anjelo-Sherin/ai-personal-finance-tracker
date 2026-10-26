import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#D81B60",
        primaryDark: "#AD1457",
        primaryLight: "#F06292",
        soft: "#FCE4EC",
        blush: "#FFF0F5",
        accent: "#F48FB1",
        accentLight: "#F8BBD0",
        ink: "#3B1222",
        muted: "#7E5164",
        bentoBg: "#FFFFFF",
        bentoBorder: "#F3D8E2",
      },
      boxShadow: {
        pink: "0 12px 36px rgba(216, 27, 96, 0.12)",
        pinkSm: "0 4px 16px rgba(216, 27, 96, 0.06)",
        bento: "0 2px 12px -2px rgba(74, 26, 44, 0.04), 0 8px 24px -4px rgba(216, 27, 96, 0.07)",
        bentoHover: "0 6px 20px -2px rgba(216, 27, 96, 0.12), 0 16px 36px -4px rgba(74, 26, 44, 0.08)",
      },
      borderRadius: {
        card: "20px",
        bento: "24px",
        bentoSm: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
