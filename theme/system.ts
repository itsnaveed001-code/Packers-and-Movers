import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

// EasyShiftX Chakra theme.
// - `brand`        = navy scale (logo-derived, #0E1A3D base) — primary brand color.
// - `brand-light`  = brighter azure scale for lighter CTAs (used by colorPalette="brand-light").
// Components opt in via `colorPalette="brand"` / `"brand-light"`, which resolve the
// solid/contrast/fg/muted/subtle/... semantic tokens below. `contrast` is the text
// color on a solid button — it MUST be defined or button text falls back to black.
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
        'brand-light': {
          50: { value: '#eef7fc' },
          100: { value: '#d4ebf8' },
          200: { value: '#aedcf2' },
          300: { value: '#79c5e9' },
          400: { value: '#3ea7da' },
          500: { value: '#1d78b9' },
          600: { value: '#1a6aa3' },
          700: { value: '#175a8a' },
          800: { value: '#164a70' },
          900: { value: '#143c5b' },
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
        'brand-light': {
          solid: { value: '{colors.brand-light.500}' },
          contrast: { value: 'white' },
          fg: { value: '{colors.brand-light.700}' },
          muted: { value: '{colors.brand-light.100}' },
          subtle: { value: '{colors.brand-light.50}' },
          emphasized: { value: '{colors.brand-light.600}' },
          focusRing: { value: '{colors.brand-light.400}' },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
