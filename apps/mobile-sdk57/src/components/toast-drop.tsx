// O aviso em gota mora em toast-drop-skia.tsx. No aparelho ele vale direto; no navegador toast-drop.web.tsx só o usa
// depois que o Skia (CanvasKit) termina de carregar.
export { ToastDrop, TOAST_EXIT_MS } from './toast-drop-skia';
