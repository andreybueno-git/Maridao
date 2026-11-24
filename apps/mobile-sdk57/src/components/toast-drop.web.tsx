import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Versão do navegador do aviso em gota (toast-drop.tsx). Lá a gota é líquida, desenhada pelo Skia; aqui o Skia fica de fora
// (no navegador ele precisa do CanvasKit, WebAssembly de ~7 MB, e quebra a renderização estática). Fica o mesmo movimento:
// a gota cai, a pílula abre a partir dela e recolhe na saída, com os mesmos tempos e molas. Só não há a fusão das formas.
// Props, posição, toques e "Reduzir movimento" iguais aos de toast-drop.tsx.

export const TOAST_EXIT_MS = 320;
const DROP = 44, BELOW_SAFE = 6, OPEN_DELAY = 150, BODY_EXIT = 260;
const always = { reduceMotion: ReduceMotion.Never } as const;

type Props = { sheet?: boolean; lead: ReactNode; children: ReactNode; fill: string; border: string; shadow: string; leaving: boolean; onHold: () => void; onResume: () => void; onDismiss: () => void };

export function ToastDrop({ sheet = false, lead, children, fill, shadow, leaving, onHold, onResume, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const top = sheet ? BELOW_SAFE * 2 : insets.top + BELOW_SAFE;
  const maxWidth = Math.min(width - 32, 440);

  const fall = useSharedValue(reduced ? 1 : 0), head = useSharedValue(reduced ? 1 : 0), body = useSharedValue(reduced ? 1 : 0);
  const shown = useSharedValue(0), drag = useSharedValue(0);
  const measured = size !== null;
  useEffect(() => {
    if (!measured) return;
    if (reduced) { shown.set(withTiming(1, { duration: 180, ...always })); return; }
    shown.set(withTiming(1, { duration: 120 }));
    fall.set(withSpring(1, { mass: 1, damping: 15, stiffness: 240 }));
    head.set(withDelay(OPEN_DELAY, withSpring(1, { mass: 1, damping: 24, stiffness: 210 })));
    body.set(withDelay(OPEN_DELAY, withSpring(1, { mass: 1, damping: 16, stiffness: 150 })));
  }, [measured, reduced, shown, fall, head, body]);
  useEffect(() => {
    if (!leaving) return;
    if (reduced) { shown.set(withTiming(0, { duration: 160, ...always })); return; }
    body.set(withTiming(0, { duration: BODY_EXIT, easing: Easing.inOut(Easing.cubic) }));
    head.set(withTiming(0, { duration: BODY_EXIT, easing: Easing.inOut(Easing.cubic) }));
    shown.set(withDelay(TOAST_EXIT_MS - 140, withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) })));
  }, [leaving, reduced, shown, head, body]);

  const touch = useRef({ x: 0, y: 0 });
  const settle = () => { drag.set(withSpring(0, { mass: 1, damping: 18, stiffness: 260 })); onResume(); };
  const onGrant = (event: GestureResponderEvent) => { touch.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; onHold(); };
  const onMove = (event: GestureResponderEvent) => { const dy = event.nativeEvent.pageY - touch.current.y; drag.set(dy < 0 ? dy : dy * 0.15); };
  const onRelease = (event: GestureResponderEvent) => {
    const dx = event.nativeEvent.pageX - touch.current.x, dy = event.nativeEvent.pageY - touch.current.y;
    if (dy < -18 || (Math.abs(dy) < 6 && Math.abs(dx) < 6)) onDismiss(); else settle();
  };

  const w = size?.w ?? DROP, slide = (w - DROP) / 2;
  // caindo, a gota estica um pouco na vertical (como a do desenho nativo)
  const boxStyle = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ translateY: -(top + DROP + 28) * (1 - fall.get()) + drag.get() }] }));
  const windowStyle = useAnimatedStyle(() => {
    const left = slide * (1 - head.get()), stretch = Math.max(0, 1 - fall.get());
    return { left, width: Math.min(w - left, Math.max(DROP, DROP + (w - DROP) * body.get())), transform: [{ scaleX: 1 - stretch * 0.14 }, { scaleY: 1 + stretch * 0.35 }] };
  });
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -slide * (1 - head.get()) }] }));
  const leadStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slide * (1 - head.get()) }] }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, (body.get() - 0.6) / 0.35)) }));

  if (!size) {
    return (
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.host, { top }]}>
        <View style={[s.row, s.measure, { maxWidth }]} onLayout={event => setSize({ w: Math.ceil(event.nativeEvent.layout.width) + 1, h: Math.ceil(event.nativeEvent.layout.height) })}>
          {lead}<View style={s.body}>{children}</View>
        </View>
      </View>
    );
  }
  return (
    <View pointerEvents="box-none" style={[s.host, { top }]}>
      <Animated.View onStartShouldSetResponder={() => true} onResponderGrant={onGrant} onResponderMove={onMove} onResponderRelease={onRelease} onResponderTerminate={settle} style={[{ width: size.w, height: size.h }, boxStyle]}>
        <Animated.View style={[s.window, { height: size.h, backgroundColor: fill, boxShadow: `0 6px 18px ${shadow}38` }, windowStyle]}>
          <Animated.View style={[s.row, { width: size.w, minHeight: size.h }, rowStyle]}>
            <Animated.View style={leadStyle}>{lead}</Animated.View>
            <Animated.View style={[s.body, bodyStyle]}>{children}</Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 20 },
  window: { position: 'absolute', top: 0, overflow: 'hidden', borderRadius: DROP / 2 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: DROP, paddingLeft: 8, paddingRight: 18, paddingVertical: 8, gap: 10 },
  measure: { position: 'absolute', opacity: 0 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
});
