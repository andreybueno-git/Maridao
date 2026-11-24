import { useEffect } from 'react';
import { skiaModules } from '@/lib/skia-web';

// Versão do navegador: a mesma gosma do aparelho (theme-goo-skia.tsx), desenhada pelo Skia sobre o CanvasKit, que
// src/lib/skia-web.ts carrega durante a tela de carregamento (o aplicativo só aparece depois). Se o CanvasKit não carregou,
// a troca é direta: cobre, troca o tema e descobre, sem desenho.
type Props = { origin: { x: number; y: number }; toDark: boolean; color: string; painted: boolean; onCovered: () => void; onEnd: () => void };

export const gooAvailable = true;
export function ThemeGoo(props: Props) {
  const goo = skiaModules()?.goo;
  return goo ? <goo.ThemeGoo {...props} /> : <Direct {...props} />;
}

function Direct({ painted, onCovered, onEnd }: Props) {
  useEffect(() => { onCovered(); }, [onCovered]);
  useEffect(() => { if (painted) onEnd(); }, [painted, onEnd]);
  return null;
}
