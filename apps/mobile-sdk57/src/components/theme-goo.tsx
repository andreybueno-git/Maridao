// A gosma da troca de tema mora em theme-goo-skia.tsx. No aparelho ela vale direto; no navegador theme-goo.web.tsx
// só a usa depois que o Skia (CanvasKit) termina de carregar.
export { gooAvailable, ThemeGoo } from './theme-goo-skia';
