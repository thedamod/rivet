import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "./AppIcon";

// T3's sheet header geometry: 44px close control, 16px title, 12px subtitle.
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  colors,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  colors: { canvas: string; surface: string; text: string; textMuted: string };
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={Platform.OS !== "ios"}
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      onRequestClose={onClose}
      onDismiss={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[s.frame, Platform.OS !== "ios" && s.android]}
      >
        {Platform.OS !== "ios" && (
          <Pressable
            accessibilityLabel="Dismiss sheet"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        )}
        <SafeAreaView
          edges={["bottom", "left", "right"]}
          style={[
            s.sheet,
            { backgroundColor: colors.canvas },
            Platform.OS !== "ios" && s.androidSheet,
          ]}
        >
          <View style={s.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={[s.close, { backgroundColor: colors.surface }]}
            >
              <AppIcon name="close" size={20} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={1} style={[s.title, { color: colors.text }]}>
                {title}
              </Text>
              {subtitle && (
                <Text
                  numberOfLines={1}
                  style={[s.subtitle, { color: colors.textMuted }]}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  frame: { flex: 1 },
  android: { backgroundColor: "#0008", justifyContent: "flex-end" },
  sheet: { flex: 1 },
  androidSheet: {
    flex: 0,
    height: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "GeistSemiBold", fontSize: 16, lineHeight: 23 },
  subtitle: { fontFamily: "Geist", fontSize: 12, lineHeight: 16 },
});
