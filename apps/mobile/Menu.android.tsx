import React, { useRef, useState } from "react";
import { Modal, Pressable, View, type ViewInstance } from "react-native";
import type { MenuAction, MenuComponentProps } from "@react-native-menu/menu";
import {
  Box,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  RNHostView,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  defaultMinSize,
  size,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import {
  T3_CODE_DARK_THEME_COLORS as dark,
  T3_CODE_LIGHT_THEME_COLORS as light,
} from "@git-client/theme";
import { AppIcon, type AppIconName } from "./AppIcon";
const images: Record<string, AppIconName> = {
  btn_star: "star-outline",
  ic_menu_view: "open-outline",
  ic_menu_add: "add-outline",
};
// Same Compose popup and default Material menu shape as T3 MenuPopup.android.
export function MenuView({
  children,
  actions,
  onPressAction,
  themeVariant,
  style,
}: MenuComponentProps) {
  const trigger = useRef<ViewInstance>(null);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const colors = themeVariant === "light" ? light : dark;
  const close = () => setAnchor(null);
  const choose = (action: MenuAction) => {
    close();
    if (action.id) onPressAction?.({ nativeEvent: { event: action.id } });
  };
  const glyph = (name: AppIconName, action: MenuAction) => (
    <RNHostView matchContents modifiers={[size(24, 24)]}>
      <Pressable
        accessible={false}
        focusable={false}
        disabled={action.attributes?.disabled}
        onPress={() => choose(action)}
        style={{ width: 24, height: 24 }}
      >
        <AppIcon
          name={name}
          size={24}
          color={action.attributes?.disabled ? colors.textMuted : colors.text}
        />
      </Pressable>
    </RNHostView>
  );
  return (
    <>
      <Pressable
        ref={trigger}
        collapsable={false}
        style={style}
        accessibilityLabel="Repository actions"
        accessibilityRole="button"
        onPress={() =>
          trigger.current?.measureInWindow((x, y, width, height) =>
            setAnchor({ x, y, width, height }),
          )
        }
      >
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {children}
        </View>
      </Pressable>
      <Modal
        visible={!!anchor}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        animationType="none"
        onRequestClose={close}
      >
        {anchor && (
          <Host
            colorScheme={themeVariant === "light" ? "light" : "dark"}
            seedColor={colors.accent}
            ignoreSafeAreaKeyboardInsets
            style={{
              position: "absolute",
              left: anchor.x,
              top: anchor.y,
              width: anchor.width,
              height: anchor.height,
            }}
          >
            <DropdownMenu
              expanded
              onDismissRequest={close}
              color={themeVariant === "light" ? colors.canvas : colors.surface}
            >
              <DropdownMenu.Trigger>
                <Box modifiers={[size(anchor.width, anchor.height)]} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Items>
                {actions
                  .filter((action) => !action.attributes?.hidden)
                  .map((action, index) => (
                    <DropdownMenuItem
                      key={action.id ?? index}
                      enabled={!action.attributes?.disabled}
                      modifiers={[
                        width(250),
                        defaultMinSize({ minHeight: 48 }),
                      ]}
                      onClick={() => choose(action)}
                    >
                      {action.image && images[action.image] && (
                        <DropdownMenuItem.LeadingIcon>
                          {glyph(images[action.image], action)}
                        </DropdownMenuItem.LeadingIcon>
                      )}
                      <DropdownMenuItem.Text>
                        <Text
                          color={
                            action.attributes?.disabled
                              ? colors.textMuted
                              : colors.text
                          }
                          style={{
                            typography: "bodyLarge",
                            fontFamily: "Geist",
                            fontSize: 16,
                            lineHeight: 23,
                          }}
                        >
                          {action.title}
                        </Text>
                      </DropdownMenuItem.Text>
                      {action.state === "on" && (
                        <DropdownMenuItem.TrailingIcon>
                          {glyph("checkmark-done-outline", action)}
                        </DropdownMenuItem.TrailingIcon>
                      )}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenu.Items>
            </DropdownMenu>
          </Host>
        )}
      </Modal>
    </>
  );
}
