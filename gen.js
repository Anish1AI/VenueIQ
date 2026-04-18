const fs = require('fs');

const darkColors = {
  "inverse-on-surface": "#4d556b",
  "surface-container-lowest": "#000000",
  "tertiary-container": "#f8a010",
  "on-secondary-fixed": "#00452d",
  "error-dim": "#d73357",
  "on-tertiary-fixed-variant": "#563400",
  "on-surface-variant": "#a3aac4",
  "secondary-fixed-dim": "#58e7ab",
  "surface-container-high": "#141f38",
  "error-container": "#a70138",
  "surface": "#060e20",
  "on-tertiary-container": "#4a2c00",
  "secondary-dim": "#58e7ab",
  "primary-fixed-dim": "#a27cff",
  "on-primary-container": "#2b006e",
  "tertiary-fixed": "#f8a010",
  "surface-container": "#0f1930",
  "surface-variant": "#192540",
  "outline": "#6d758c",
  "on-error": "#490013",
  "surface-bright": "#1f2b49",
  "secondary-fixed": "#69f6b8",
  "primary-dim": "#8455ef",
  "surface-container-highest": "#192540",
  "error": "#ff6e84",
  "on-primary": "#39008c",
  "on-tertiary": "#573500",
  "secondary-container": "#006c49",
  "surface-dim": "#060e20",
  "secondary": "#69f6b8",
  "on-surface": "#dee5ff",
  "on-secondary-container": "#e1ffec",
  "tertiary": "#ffb148",
  "tertiary-fixed-dim": "#e79400",
  "inverse-surface": "#faf8ff",
  "on-primary-fixed": "#000000",
  "on-secondary": "#005a3c",
  "outline-variant": "#40485d",
  "on-primary-fixed-variant": "#370086",
  "on-background": "#dee5ff",
  "background": "#060e20",
  "on-secondary-fixed-variant": "#006544",
  "tertiary-dim": "#e79400",
  "on-tertiary-fixed": "#2a1700",
  "primary": "#ba9eff",
  "primary-fixed": "#ae8dff",
  "primary-container": "#ae8dff",
  "on-error-container": "#ffb2b9",
  "surface-container-low": "#091328",
  "surface-tint": "#ba9eff",
  "inverse-primary": "#6e3bd7"
};

// Extremely simple light mode palette generation
// We'll map primary to purple-600, secondary to emerald-600, surface to whites/grays.
const lightColors = {
  "surface": "#f8fafc",
  "on-surface": "#0f172a",
  "surface-container": "#ffffff",
  "surface-container-low": "#f1f5f9",
  "surface-container-high": "#e2e8f0",
  "surface-container-highest": "#cbd5e1",
  "surface-container-lowest": "#ffffff",
  "on-surface-variant": "#475569",
  "primary": "#6366f1",
  "primary-dim": "#4f46e5",
  "primary-container": "#e0e7ff",
  "on-primary-container": "#312e81",
  "secondary": "#10b981",
  "secondary-dim": "#059669",
  "tertiary": "#f59e0b",
  "tertiary-dim": "#d97706",
  "on-tertiary": "#ffffff",
  "outline-variant": "#cbd5e1",
  "background": "#f8fafc",
  "on-background": "#0f172a"
};

// Fallback logic for keys missing in lightColors
for (const key of Object.keys(darkColors)) {
  if (!lightColors[key]) {
    lightColors[key] = darkColors[key]; // Just use dark as fallback so variables exist
  }
}

let css = `:root {\n`;
for (const [k, v] of Object.entries(lightColors)) {
  css += `  --color-${k}: ${v};\n`;
}
css += `}\n\n.dark {\n`;
for (const [k, v] of Object.entries(darkColors)) {
  css += `  --color-${k}: ${v};\n`;
}
css += `}\n`;

let twConfig = `{\n`;
for (const k of Object.keys(darkColors)) {
  twConfig += `  "${k}": "var(--color-${k})",\n`;
}
twConfig += `}\n`;

fs.writeFileSync('generated_theme.txt', css + '\n\nTAILWIND:\n' + twConfig);
console.log('done');
