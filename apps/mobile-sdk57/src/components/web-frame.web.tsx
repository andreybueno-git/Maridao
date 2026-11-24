import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Image } from 'react-native';
import { SafeAreaFrameContext, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

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
// A decisão só existe no navegador: a página estática (gerada no build) e o primeiro desenho são iguais (fundo preto), e
// logo em seguida a moldura ou o aplicativo aparecem (useSyncExternalStore com o valor "start" do lado do servidor). Assim o
// navegador não acusa diferença entre o HTML gerado e o desenhado. Mudar o tamanho da janela refaz a escolha.

const SCREEN = { width: 402, height: 874 }, INSETS = { top: 54, bottom: 34, left: 0, right: 0 };
const BEZEL = 13, RADIUS = 62, WIDE = 700;
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
  useEffect(() => { if (mode === 'inside') return insideStyle(); }, [mode]);
  if (mode === 'start') return <div style={{ position: 'fixed', inset: 0, background: BLACK }} />;
  if (mode === 'frame') return <Phone />;
  if (mode === 'app') return <>{children}</>;
  return (
    <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, ...SCREEN }}>
      <SafeAreaInsetsContext.Provider value={INSETS}>{children}</SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>
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
