import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Image } from 'react-native';
import { SafeAreaFrameContext, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { getBoot, loadSkiaWeb, serverBoot, subscribeBoot } from '@/lib/skia-web';
import { SYMBOL_MASK } from '@/components/loader-symbol';

// Versão do navegador: o aplicativo aparece dentro de um celular, para mostrar no computador ou no projetor.
//
//   Tela larga (computador):  a página desenha um iPhone e carrega o próprio aplicativo dentro dele, num <iframe> do
//                             tamanho da tela do aparelho (402 × 874). Lá dentro a janela tem o tamanho de um celular de
//                             verdade, então tudo que mede a janela (avisos, troca de tema, abertura) se comporta como no iOS.
//   Dentro da moldura:        o aplicativo recebe a área segura do iPhone (54 em cima, 34 embaixo) e desenha a barra de
//                             status, a ilha e o indicador de início por cima de tudo (FrameChrome). O cursor vira um dedo.
//   Tela estreita (celular):  o aplicativo ocupa a tela inteira, sem moldura.
//   ?sem-moldura no endereço: força a tela inteira em qualquer tamanho.
//
// A decisão só existe no navegador: a página estática (gerada no build) e o primeiro desenho são iguais, e logo em seguida
// a moldura ou o aplicativo aparecem (useSyncExternalStore com o valor "start" do lado do servidor). Assim o navegador não
// acusa diferença entre o HTML gerado e o desenhado. Mudar o tamanho da janela refaz a escolha.
//
// Tela de carregamento: o símbolo do Maridão enchendo de verde, como líquido, com uma onda na superfície. Ela já vem no HTML
// (aparece antes de o JavaScript chegar, subindo sozinha até um terço) e, com o aplicativo no ar, passa a seguir o download
// do Skia (src/lib/skia-web.ts), que desenha a gosma e a gota, e espera a API acordar ("Ligando o servidor…", com a logo quase
// cheia). Cheia, a logo dá um pulo e some; o aplicativo nasce por baixo
// e a abertura dele começa com o símbolo no mesmo lugar e tamanho (intro-animation: 64 × 1,5, a 47% da altura).

const SCREEN = { width: 402, height: 874 }, INSETS = { top: 54, bottom: 34, left: 0, right: 0 };
const BEZEL = 13, RADIUS = 62, WIDE = 700, SYMBOL = 96, FIRST = 0.34, HOLD = 320;
const BLACK = '#020300', GREEN = '#A1FF1D', PALE = '#DCFFA4';
type Mode = 'start' | 'app' | 'frame' | 'inside';

function decide(): Mode {
  if (window.self !== window.top) return 'inside';
  if (new URLSearchParams(window.location.search).has('sem-moldura') || window.innerWidth < WIDE) return 'app';
  return 'frame';
}

const onResize = (notify: () => void) => { window.addEventListener('resize', notify); return () => window.removeEventListener('resize', notify); };
const never = () => () => {};
const isInside = () => window.self !== window.top;

export function WebFrame({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore<Mode>(onResize, decide, () => 'start');
  const boot = useSyncExternalStore(subscribeBoot, getBoot, () => serverBoot);
  const [ready, setReady] = useState(false);
  const loads = mode === 'app' || mode === 'inside';
  useEffect(() => { if (loads) loadSkiaWeb(); }, [loads]);
  useEffect(() => { if (mode === 'inside') return insideStyle(); }, [mode]);
  // cheia, a logo fica um instante na tela antes de sumir
  useEffect(() => {
    if (!boot.done || ready) return;
    const timer = setTimeout(() => setReady(true), HOLD);
    return () => clearTimeout(timer);
  }, [boot.done, ready]);
  if (mode === 'frame') return <Phone />;
  const app = !ready ? null : mode === 'inside' ? (
    <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, ...SCREEN }}>
      <SafeAreaInsetsContext.Provider value={INSETS}>{children}</SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>
  ) : children;
  return <>{app}<Loader level={loads ? FIRST + (1 - FIRST) * boot.progress : null} waking={boot.waking} leaving={ready} /></>;
}

// A onda da superfície: dois períodos de 48 px em 192 px; andando meia largura, o desenho volta igual.
const WAVE = 'M0 5Q12 0 24 5T48 5T72 5T96 5T120 5T144 5T168 5T192 5V12H0Z';
const LOADER_CSS = `
.mrl-liquid{position:absolute;left:0;right:0;bottom:0;height:0;background:${GREEN};transition:height .5s cubic-bezier(.3,.7,.3,1)}
.mrl-auto{animation:mrl-fill 1.5s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes mrl-fill{from{height:5%}to{height:${FIRST * 100}%}}
.mrl-wave{position:absolute;left:0;bottom:100%;width:${SYMBOL * 2}px;height:12px;margin-bottom:-2px;animation:mrl-wave 1.7s linear infinite}
.mrl-back{opacity:.42;margin-bottom:1px;animation-duration:2.9s;animation-direction:reverse}
@keyframes mrl-wave{from{transform:translateX(0)}to{transform:translateX(-${SYMBOL}px)}}
@media (prefers-reduced-motion:reduce){.mrl-wave,.mrl-auto{animation:none}.mrl-auto{height:${FIRST * 100}%}}`;

function Loader({ level, waking, leaving }: { level: number | null; waking: boolean; leaving: boolean }) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const glow = level ?? FIRST, percent = level === null ? null : Math.round(level * 100);
  const mask = `url(${SYMBOL_MASK}) center / contain no-repeat`;
  return (
    <div role="progressbar" aria-label="Carregando o Maridão" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined}
      onTransitionEnd={event => { if (leaving && event.target === event.currentTarget) setGone(true); }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: BLACK, opacity: leaving ? 0 : 1, transition: 'opacity 380ms ease', pointerEvents: leaving ? 'none' : 'auto' }}>
      <style>{LOADER_CSS}</style>
      <div style={{ position: 'absolute', left: '50%', top: '47%', width: SYMBOL, height: SYMBOL, marginLeft: -SYMBOL / 2, marginTop: -SYMBOL / 2, filter: `drop-shadow(0 0 ${8 + 22 * glow}px rgba(161,255,29,${(0.12 + 0.38 * glow).toFixed(2)}))`, transform: `scale(${leaving ? 1.07 : 1})`, transition: 'transform 320ms cubic-bezier(.2,1.7,.4,1), filter .5s ease' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', WebkitMask: mask, mask }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(161,255,29,.2)' }} />
          <div className={level === null ? 'mrl-liquid mrl-auto' : 'mrl-liquid'} style={level === null ? undefined : { height: `${level * 100}%` }}>
            <svg className="mrl-wave mrl-back" viewBox="0 0 192 12" preserveAspectRatio="none" aria-hidden><path d={WAVE} fill={GREEN} /></svg>
            <svg className="mrl-wave" viewBox="0 0 192 12" preserveAspectRatio="none" aria-hidden><path d={WAVE} fill={GREEN} /></svg>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: `calc(47% + ${SYMBOL / 2 + 30}px)`, textAlign: 'center', font: '700 12px/1 -apple-system, "SF Pro Text", system-ui, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C977F', fontVariantNumeric: 'tabular-nums' }}>
        {waking ? 'Ligando o servidor…' : `Carregando${percent === null ? '' : ` · ${percent}%`}`}
      </div>
    </div>
  );
}

// Dentro da moldura: cursor redondo (o "dedo" que a turma acompanha), sem barras de rolagem e sem seleção de texto
// ao arrastar, como num aparelho. Campos de texto continuam selecionáveis.
function insideStyle() {
  const finger = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="15" fill="rgba(120,120,120,.38)" stroke="rgba(255,255,255,.85)" stroke-width="2"/></svg>')}") 20 20, pointer`;
  const tag = document.createElement('style');
  tag.textContent = `*{cursor:${finger}!important;scrollbar-width:none}*::-webkit-scrollbar{display:none}body{user-select:none;-webkit-user-select:none}input,textarea{user-select:text;-webkit-user-select:text}`;
  document.head.appendChild(tag);
  return () => { tag.remove(); };
}

// Barra de status, ilha e indicador de início, desenhados por cima do aplicativo quando ele está dentro da moldura.
// Acompanham o tema (texto claro no escuro). Não pegam toques.
export function FrameChrome() {
  const { target } = useTheme();
  const inside = useSyncExternalStore(never, isInside, () => false);
  if (!inside) return null;
  const ink = target === 'dark' ? '#FFFFFF' : '#000000';
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1000 }}>
      <div style={{ position: 'absolute', top: 11, left: '50%', width: 126, height: 37, marginLeft: -63, borderRadius: 20, background: '#000' }} />
      <span style={{ position: 'absolute', top: 18, left: 0, width: 140, textAlign: 'center', font: '600 17px -apple-system, "SF Pro Text", system-ui, sans-serif', letterSpacing: -0.3, color: ink }}>9:41</span>
      <svg width="78" height="14" viewBox="0 0 78 14" style={{ position: 'absolute', top: 22, right: 28 }}>
        {[0, 1, 2, 3].map(i => <rect key={i} x={i * 5} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="1" fill={ink} />)}
        <path d="M33 4.2a9.6 9.6 0 0 1 12.8 0l-1.4 1.5a7.5 7.5 0 0 0-10 0zM35.4 6.8a6 6 0 0 1 8 0l-1.5 1.5a3.8 3.8 0 0 0-5 0zM39.4 12.2l-2-2a2.8 2.8 0 0 1 4 0z" fill={ink} />
        <rect x="51" y="1" width="24" height="12" rx="3.6" fill="none" stroke={ink} strokeOpacity=".4" />
        <rect x="53" y="3" width="20" height="8" rx="2" fill={ink} />
        <path d="M76.4 5v4a2.2 2.2 0 0 0 0-4z" fill={ink} fillOpacity=".45" />
      </svg>
      <div style={{ position: 'absolute', bottom: 8, left: '50%', width: 139, height: 5, marginLeft: -69.5, borderRadius: 3, background: ink }} />
    </div>
  );
}

// A página da moldura: o iPhone no centro, a marca ao lado (só em tela larga o bastante) e o aplicativo dentro.
function Phone() {
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const outer = { w: SCREEN.width + BEZEL * 2, h: SCREEN.height + BEZEL * 2 };
  const scale = Math.min(1.25, (view.h - 48) / outer.h, (view.w - 32) / outer.w);
  const side = view.w >= 1100;
  const src = window.location.pathname + window.location.search;
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: `radial-gradient(ellipse 60% 70% at ${side ? '62%' : '50%'} 50%, #16220A 0%, ${BLACK} 70%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: side ? 96 : 0, fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif' }}>
      {side ? (
        <div style={{ width: 380, color: '#FFFFFF' }}>
          <Image source={require('@/assets/images/icon.png')} accessibilityIgnoresInvertColors style={{ width: 88, height: 88, borderRadius: 22, boxShadow: `0 0 60px ${GREEN}33` }} />
          <div style={{ marginTop: 28, font: '800 64px/1 -apple-system, "SF Pro Display", system-ui, sans-serif', letterSpacing: '-0.045em' }}>Maridão</div>
          <div style={{ marginTop: 16, fontSize: 24, lineHeight: 1.3, fontWeight: 600, letterSpacing: '-0.02em', color: PALE }}>Conectando quem precisa a quem sabe fazer.</div>
          <div style={{ marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: GREEN, color: BLACK, fontSize: 15, fontWeight: 700 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: BLACK }} />Palmas · TO
          </div>
          <div style={{ marginTop: 40, fontSize: 14, lineHeight: 1.5, color: '#8C977F' }}>Demonstração com dados fictícios.<br />Clique para tocar e use a roda do mouse para rolar.</div>
        </div>
      ) : null}
      <div style={{ width: outer.w * scale, height: outer.h * scale, flex: 'none' }}>
        <div style={{ position: 'relative', width: outer.w, height: outer.h, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          {/* botões laterais */}
          {[[-3, 190, 34], [-3, 250, 64], [-3, 330, 64], [outer.w - 1, 280, 100]].map(([x, y, h], i) => (
            <div key={i} style={{ position: 'absolute', left: x, top: y, width: 4, height: h, borderRadius: 2, background: 'linear-gradient(90deg, #3A3D38, #6E7369)' }} />
          ))}
          {/* corpo: borda de titânio e moldura preta */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS + BEZEL, background: '#0B0C0A', boxShadow: `0 0 0 2px #50544C, 0 0 0 3px #1A1C18, 0 40px 90px rgba(0,0,0,.65), 0 0 120px ${GREEN}1F` }} />
          <div style={{ position: 'absolute', left: BEZEL, top: BEZEL, width: SCREEN.width, height: SCREEN.height, borderRadius: RADIUS, overflow: 'hidden', background: BLACK, isolation: 'isolate' }}>
            <iframe title="Maridão" src={src} width={SCREEN.width} height={SCREEN.height} style={{ border: 0, display: 'block', width: SCREEN.width, height: SCREEN.height, background: BLACK }} />
          </div>
        </div>
      </div>
    </div>
  );
}
