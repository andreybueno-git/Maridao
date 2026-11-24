import { useEffect, useRef, useSyncExternalStore, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View, type AlertButton, type AlertOptions } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { themed } from '@/theme';

// Versão do navegador de showAlert (alert.tsx). O Alert do React Native Web é vazio: o toque em "Aceitar proposta",
// "Cancelar solicitação" etc. não abria nada e o onPress de confirmar nunca rodava. Aqui o pedido entra numa fila e o
// AlertHost (montado no _layout raiz) desenha um diálogo do próprio app: título, texto e os mesmos botões, na mesma ordem
// de importância do iOS (a ação principal em cima, "Voltar"/"Cancelar" por último, em pílula; destrutiva em vermelho).
// Esc e o toque fora do cartão valem como o botão de cancelar (quando houver e o pedido permitir). Sem botões, mostra "OK".
// O diálogo nasce dentro do app; na moldura de celular (web-frame.web.tsx), fica dentro da tela do aparelho.

type Item = { id: number; title: string; message?: string; buttons: AlertButton[]; cancelable: boolean };
let queue: Item[] = [], sequence = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const current = () => queue[0] ?? null;

export function showAlert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
  queue = [...queue, { id: ++sequence, title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], cancelable: options?.cancelable ?? true }];
  emit();
}

// Fecha antes de chamar o onPress: a ação pode abrir outro aviso (que entra na fila e aparece em seguida).
function choose(item: Item, button?: AlertButton) {
  queue = queue.filter(other => other.id !== item.id);
  emit();
  button?.onPress?.();
}
const cancelOf = (item: Item) => item.buttons.find(button => button.style === 'cancel');

export function AlertHost() {
  const item = useSyncExternalStore(subscribe, current, () => null);
  const s = useS();
  const first = useRef<ComponentRef<typeof Pressable>>(null);
  useEffect(() => {
    if (!item) return;
    // o foco vai para a ação principal, para quem usa teclado (Enter confirma, Esc volta)
    const focus = setTimeout(() => (first.current as unknown as HTMLElement | null)?.focus?.(), 60);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && item.cancelable) { event.preventDefault(); choose(item, cancelOf(item)); } };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(focus); window.removeEventListener('keydown', onKey); };
  }, [item]);
  if (!item) return null;
  const ordered = [...item.buttons.filter(button => button.style !== 'cancel'), ...item.buttons.filter(button => button.style === 'cancel')];
  const dismiss = () => { const cancel = cancelOf(item); if (item.cancelable && (cancel || item.buttons.length === 1)) choose(item, cancel ?? item.buttons[0]); };
  return (
    <Animated.View key={item.id} entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={s.layer}>
      <Pressable accessibilityLabel="Fechar" style={StyleSheet.absoluteFill} onPress={dismiss} />
      <Animated.View entering={ZoomIn.duration(180)} role="alertdialog" aria-modal aria-labelledby={`alerta-${item.id}`} style={s.card}>
        <Text nativeID={`alerta-${item.id}`} accessibilityRole="header" style={s.title}>{item.title}</Text>
        {item.message ? <Text style={s.message}>{item.message}</Text> : null}
        <View style={s.actions}>
          {ordered.map((button, index) => {
            const cancel = button.style === 'cancel', danger = button.style === 'destructive';
            return (
              <Pressable key={index} ref={index === 0 ? first : undefined} accessibilityRole="button" onPress={() => choose(item, button)}
                style={({ pressed }) => [s.button, cancel ? s.cancel : danger ? s.danger : s.primary, pressed && s.pressed]}>
                <Text style={[s.label, cancel ? s.cancelLabel : danger ? s.dangerLabel : s.primaryLabel]}>{button.text ?? 'OK'}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const useS = themed(colors => StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 500, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(2,3,0,0.55)' },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.surfaceRaised, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 10, boxShadow: '0 18px 50px rgba(2,3,0,0.35)' },
  title: { fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  message: { fontSize: 15, lineHeight: 22, color: colors.textSoft },
  actions: { gap: 10, marginTop: 8 },
  button: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  cancel: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  label: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  primaryLabel: { color: colors.onPrimary },
  dangerLabel: { color: colors.bg },
  cancelLabel: { color: colors.text, fontWeight: '600', fontSize: 15 },
  pressed: { opacity: 0.8 },
}));
