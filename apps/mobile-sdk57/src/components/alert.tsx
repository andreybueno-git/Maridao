import { Alert, type AlertButton, type AlertOptions } from 'react-native';

// Confirmações e avisos com botões. Use showAlert no lugar de Alert.alert: mesma assinatura.
// No aparelho é o Alert nativo do sistema. No navegador o Alert do React Native Web não faz nada (nem abre, nem chama o
// onPress), então alert.web.tsx desenha um diálogo próprio dentro do app (AlertHost, montado no _layout raiz).
export function showAlert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
  Alert.alert(title, message, buttons, options);
}

export function AlertHost() { return null; }
