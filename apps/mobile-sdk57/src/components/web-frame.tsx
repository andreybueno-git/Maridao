import type { ReactNode } from 'react';

// Moldura de celular da versão do navegador (web-frame.web.tsx). No aplicativo nativo não há moldura: tudo passa direto.
export function WebFrame({ children }: { children: ReactNode }) { return <>{children}</>; }
export function FrameChrome() { return null; }
