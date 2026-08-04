import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Circuit & Legacy Design System (from Stitch)
        'power-red': '#E30613',
        'circuit-yellow': '#FFED00',
        'tech-black': '#000000',
        'academic-neutral': '#F7F9FB',
        'wire-gray': '#D1D5DB',
        primary: {
          DEFAULT: '#b5000b',
          container: '#e30613',
          on: '#ffffff',
          'on-container': '#fff5f3',
          fixed: '#ffdad5',
          'fixed-dim': '#ffb4aa',
          'on-fixed': '#410001',
          'on-fixed-variant': '#930007',
        },
        secondary: {
          DEFAULT: '#686000',
          container: '#f4e300',
          on: '#ffffff',
          'on-container': '#6c6400',
          fixed: '#f7e600',
          'fixed-dim': '#d9c900',
          'on-fixed': '#1f1c00',
          'on-fixed-variant': '#4e4800',
        },
        tertiary: {
          DEFAULT: '#51596f',
          container: '#697188',
          on: '#ffffff',
          'on-container': '#f7f6ff',
          fixed: '#dae2fd',
          'fixed-dim': '#bec6e0',
          'on-fixed': '#131b2e',
          'on-fixed-variant': '#3f465c',
        },
        surface: {
          DEFAULT: '#f7f9fb',
          dim: '#d8dadc',
          bright: '#f7f9fb',
          'container-lowest': '#ffffff',
          'container-low': '#f2f4f6',
          container: '#eceef0',
          'container-high': '#e6e8ea',
          'container-highest': '#e0e3e5',
        },
        'on-surface': '#191c1e',
        'on-surface-variant': '#5e3f3b',
        'inverse-surface': '#2d3133',
        'inverse-on-surface': '#eff1f3',
        outline: '#936e69',
        'outline-variant': '#e9bcb6',
        'surface-tint': '#c0000c',
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          on: '#ffffff',
          'on-container': '#93000a',
        },
        background: '#f7f9fb',
        'on-background': '#191c1e',
        'surface-variant': '#e0e3e5',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        base: '8px',
        gutter: '24px',
        'margin-desktop': '64px',
        'margin-mobile': '20px',
        'container-max': '1280px',
      },
    },
  },
  plugins: [],
};

export default config;