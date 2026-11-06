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
function Symbol({ name, size = 18, color, style }: Props) {
  const Icon = icons[name].Icon;
  return <Icon size={size} color={color} strokeWidth={2} style={style} />;
}
export const AppIcon = Object.assign(Symbol, { glyphMap: icons });
