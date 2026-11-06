import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { icons, type AppIconName } from "./AppIconMap";
export type { AppIconName } from "./AppIconMap";
type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};
import { SymbolView, type SFSymbol } from "expo-symbols";
function Symbol({ name, size = 18, color, style }: Props) {
  const glyph = icons[name];
  if (!name.startsWith("git-") && name !== "documents-outline")
    return (
      <SymbolView
        name={glyph.sf as SFSymbol}
        size={size}
        tintColor={color}
        type="monochrome"
        style={[{ width: size, height: size }, style]}
      />
    );
  const Icon = glyph.Icon;
  return <Icon size={size} color={color} strokeWidth={2} style={style} />;
}
export const AppIcon = Object.assign(Symbol, { glyphMap: icons });
