// Shared frosted-glass style objects. Spread onto Chakra components: {...glassBar}.
// `css` carries the -webkit- prefix so the blur also works on Safari / iOS.
//
// Glass only *shows* when there is content/color behind it to blur — over a plain
// white section it just looks like a clean, lightly-frosted surface (intentional).

export const glassBar = {
  bg: 'rgba(255, 255, 255, 0.68)',
  backdropFilter: 'blur(18px) saturate(180%)',
  css: { WebkitBackdropFilter: 'blur(18px) saturate(180%)' },
  borderWidth: '1px',
  borderColor: 'rgba(255, 255, 255, 0.5)',
  boxShadow: '0 6px 24px rgba(15, 23, 42, 0.10)',
} as const;

// Subtle / minimal version for cards — light frost, soft shadow, no flashy blur.
export const glassCard = {
  bg: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(8px)',
  css: { WebkitBackdropFilter: 'blur(8px)' },
  borderWidth: '1px',
  borderColor: 'rgba(255, 255, 255, 0.6)',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05), 0 10px 24px rgba(15, 23, 42, 0.05)',
} as const;
