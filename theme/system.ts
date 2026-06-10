import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

// EasyShiftX Chakra theme. The brand palette is the navy scale carried over from
// the previous Tailwind theme (logo-derived, #0E1A3D base). Components opt in via
// `colorPalette="brand"`, which resolves the solid/contrast/fg/muted/subtle/...
// semantic tokens below.
const config = defineConfig({
  globalCss: {
    'html, body': {
      bg: 'white',
      color: 'fg',
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: 'var(--font-inter), system-ui, sans-serif' },
        body: { value: 'var(--font-inter), system-ui, sans-serif' },
      },
      colors: {
        brand: {
          50: { value: '#f2f6fb' },
          100: { value: '#e4ebf5' },
          200: { value: '#c6d4e8' },
          300: { value: '#9db3d4' },
          400: { value: '#6d8bba' },
          500: { value: '#46679c' },
          600: { value: '#2f4d82' },
          700: { value: '#21396a' },
          800: { value: '#16284d' },
          900: { value: '#0E1A3D' },
        },
      },
      radii: {
        l1: { value: '0.375rem' },
        l2: { value: '0.5rem' },
        l3: { value: '0.75rem' },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: '{colors.brand.700}' },
          contrast: { value: 'white' },
          fg: { value: '{colors.brand.700}' },
          muted: { value: '{colors.brand.100}' },
          subtle: { value: '{colors.brand.50}' },
          emphasized: { value: '{colors.brand.800}' },
          focusRing: { value: '{colors.brand.500}' },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
