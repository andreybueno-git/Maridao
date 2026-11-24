// Versão do navegador: a gosma é desenhada pelo Skia, que no navegador precisa carregar o CanvasKit (WebAssembly de ~7 MB)
// antes de qualquer tela e quebra a renderização estática. Aqui ela fica desligada e theme-transition.tsx usa a revelação
// circular, que já é a saída prevista para quando o desenho não compila. A interface é a mesma de theme-goo.tsx.
type Props = { origin: { x: number; y: number }; toDark: boolean; color: string; painted: boolean; onCovered: () => void; onEnd: () => void };

export const gooAvailable = false;
export function ThemeGoo(_props: Props) { return null; }
