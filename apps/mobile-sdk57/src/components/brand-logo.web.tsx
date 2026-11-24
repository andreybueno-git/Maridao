import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

// Versão do navegador do logotipo (brand-logo.tsx). O React Native Web pinta imagens com `tintColor` por um filtro SVG
// (`filter: url(#tint-N)`), e o navegador nem sempre redesenha a imagem quando só a cor do filtro muda: depois da troca de
// tema a logo podia ficar com a cor do tema anterior (clara sobre o fundo claro). Aqui não há filtro: a cor pedida escolhe
// entre a logo preta e a branca, que é só trocar o arquivo da imagem.
const DARK = require('../../assets/brand/logotipo-preto.png'), LIGHT = require('../../assets/brand/logotipo-branco.png');

// Cor clara (texto do tema escuro) → logo branca; cor escura ou desconhecida → logo preta.
function isLight(color: unknown) {
  const hex = typeof color === 'string' ? /^#([0-9a-f]{6})$/i.exec(color.trim())?.[1] : undefined;
  if (!hex) return false;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
}

export function BrandLogo({ style }: { style: StyleProp<ImageStyle> }) {
  const { tintColor, ...rest } = StyleSheet.flatten(style) ?? {};
  return <Image source={isLight(tintColor) ? LIGHT : DARK} style={rest} resizeMode="contain" accessibilityLabel="Maridão" />;
}
