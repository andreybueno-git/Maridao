// Carrega o Skia no navegador (só a versão web usa este arquivo).
//
// No aparelho o Skia é nativo. No navegador ele roda sobre o CanvasKit, um WebAssembly de ~8 MB (public/canvaskit.wasm,
// copiado pelo setup-skia-web nos comandos web e export:web). O pacote do Skia cria o objeto `Skia` no momento em que é
// importado pela primeira vez, a partir do CanvasKit global: por isso nada importa '@shopify/react-native-skia' de forma
// estática no navegador. Aqui o arquivo é baixado com progresso (a logo da tela de carregamento enche junto), o CanvasKit
// é iniciado com esses bytes (entregues por um endereço blob:, para não baixar duas vezes: este CanvasKit só aceita
// endereço) e só então a gosma e a gota (theme-goo-skia, toast-drop-skia) são importadas.
// Se algo falhar (ou passar de 40 s), o aplicativo segue com as versões simples: a troca de tema seca e o aviso sem a fusão.

type Modules = { goo: typeof import('@/components/theme-goo-skia'); drop: typeof import('@/components/toast-drop-skia') };
export type Boot = { progress: number; done: boolean };

const WASM = '/canvaskit.wasm', SIZE = 8_076_553, LIMIT = 40_000;
let modules: Modules | null = null, started = false, boot: Boot = { progress: 0, done: false };
const listeners = new Set<() => void>();
const emit = (next: Boot) => { boot = next; listeners.forEach(listener => listener()); };

export const subscribeBoot = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getBoot = () => boot;
export const serverBoot: Boot = { progress: 0, done: false };
export const skiaModules = () => modules;

async function download(): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(WASM);
  if (!response.ok || !response.body) throw new Error('canvaskit.wasm indisponível');
  // Com compressão o Content-Length é menor que o arquivo aberto; o tamanho conhecido do arquivo é o teto.
  const total = Math.max(Number(response.headers.get('Content-Length')) || 0, SIZE);
  const reader = response.body.getReader(), parts: Uint8Array[] = [];
  let received = 0, shown = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); received += value.length;
    const progress = Math.min(0.96, received / total);
    if (progress - shown >= 0.01) { shown = progress; emit({ progress, done: false }); }
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}

export function loadSkiaWeb() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const finish = () => { if (!boot.done) emit({ progress: 1, done: true }); };
  const limit = setTimeout(finish, LIMIT);
  (async () => {
    const address = URL.createObjectURL(new Blob([await download()], { type: 'application/wasm' }));
    const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/module/web/LoadSkiaWeb');
    try { await LoadSkiaWeb({ locateFile: () => address }); } finally { URL.revokeObjectURL(address); }
    const [goo, drop] = await Promise.all([import('@/components/theme-goo-skia'), import('@/components/toast-drop-skia')]);
    if (goo.gooAvailable) modules = { goo, drop };
  })().catch(() => {}).finally(() => { clearTimeout(limit); finish(); });
}
