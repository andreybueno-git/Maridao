import { Image, type ImageStyle, type StyleProp } from 'react-native';

// Logotipo do Maridão. A cor vem do `tintColor` do estilo (o texto do tema, ou a cor sobre o verde).
// No aparelho a imagem preta é pintada nessa cor pelo sistema. No navegador (brand-logo.web.tsx) a troca é de imagem.
const LOGO = require('../../assets/brand/logotipo-preto.png');

export function BrandLogo({ style }: { style: StyleProp<ImageStyle> }) {
  return <Image source={LOGO} style={style} resizeMode="contain" accessibilityLabel="Maridão" />;
}
