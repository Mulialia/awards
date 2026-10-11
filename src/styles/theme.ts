/**
 * YORA motion theme. Colours are sampled from the supplied letterhead:
 *   gold  ≈ rgb(238,185, 43)   red ≈ rgb(170, 9, 9)   green ≈ rgb(4,116, 60)
 * Gold is the dominant accent; red and green are used sparingly (see AfricanSignature).
 */
export const theme = {
  colors: {
    obsidian: '#07070A',
    obsidianSoft: '#0D0D12',
    panel: '#121218',
    gold: '#EEB92B',
    goldDeep: '#B8860B',
    goldLight: '#F8DA7A',
    ivory: '#F6F0E2',
    ivoryDim: 'rgba(246,240,226,0.74)',
    ivoryFaint: 'rgba(246,240,226,0.5)',
    red: '#AA0909',
    green: '#04743C',
  },
  fonts: {
    display: '"Fraunces YORA", "Times New Roman", serif',
    sans: '"Manrope YORA", Arial, sans-serif',
    // Names used for measuring (no quotes)
    displayName: 'Fraunces YORA',
    sansName: 'Manrope YORA',
  },
  // Safe margins for LED-wall cropping (≈ 6% horizontal, 6.5% vertical)
  safe: {x: 112, y: 70},
  layout: {
    portrait: {x: 140, y: 190, w: 560, h: 740, chamfer: 72},
    textX: 830,
    textW: 960,
  },
} as const;

export const goldGradient = `linear-gradient(100deg, ${theme.colors.goldDeep} 0%, ${theme.colors.gold} 38%, ${theme.colors.goldLight} 55%, ${theme.colors.gold} 72%, ${theme.colors.goldDeep} 100%)`;
