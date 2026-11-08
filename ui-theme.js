// Source/reference tokens for the no-build portfolio client.
// Adapted from BoardUI FREE (MIT), styles/theme.css at commit
// ec5c5eb3e29c2441be63b9422cd54f411ef23466. See BOARDUI-NOTICE.txt.
// This file is intentionally not imported at runtime: the host's module factory
// provides React only. Matching runtime recipes are embedded in client.js.
// No BoardUI package, React copy, React Aria or Tailwind dependency is installed.
export const wealthTheme = Object.freeze({
  radius: Object.freeze({ control: '10px', card: '16px', inset: '20px' }),
  // BoardUI's 10px / 20px radius steps and soft 6% / 10% elevation recipe.
  shadow: Object.freeze({
    card: '0 1px 1px 0 rgb(0 0 0 / 0.05)',
    control: '0 1px 2px 0 rgb(0 0 0 / 0.06), 0 1px 3px 0 rgb(0 0 0 / 0.10)',
    selected: 'inset 0 1px 0 0 rgb(255 255 255 / 0.251)',
  }),
  transition: '150ms',
  fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  light: Object.freeze({ canvas: '#f5f3ee', panel: '#eeece5', surface: '#fffefa', ink: '#243638', muted: '#6d7b78', border: '#e2e1d8', teal: '#285b53', terracotta: '#ad7259', selected: '#e6eee7' }),
  dark: Object.freeze({ canvas: '#171d1e', panel: '#1d2526', surface: '#222c2d', ink: '#eeeae2', muted: '#a9b4b2', border: '#354143', teal: '#a9cec3', terracotta: '#d39c86', selected: '#303a38' }),
})
