import React, { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { GitHubClient } from "@git-client/github";
import IconHeading from "@tabler/icons-react-native/IconHeading";
import IconBold from "@tabler/icons-react-native/IconBold";
import IconItalic from "@tabler/icons-react-native/IconItalic";
import IconBlockquote from "@tabler/icons-react-native/IconBlockquote";
import IconCode from "@tabler/icons-react-native/IconCode";
import IconLink from "@tabler/icons-react-native/IconLink";
import IconList from "@tabler/icons-react-native/IconList";
import IconListNumbers from "@tabler/icons-react-native/IconListNumbers";
import IconListCheck from "@tabler/icons-react-native/IconListCheck";
import { NativeMarkdown } from "./Markdown";

type Colors = {
  canvas: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
};

export function CommentEditor({
  value,
  onChangeText,
  label,
  api,
  repo,
  branch,
  colors,
}: {
  value: string;
  onChangeText: (value: string) => void;
  label: string;
  api: GitHubClient;
  repo: string;
  branch: string;
  colors: Colors;
}) {
  const [preview, setPreview] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const format = (before: string, after = "") => {
    const selected = value.slice(selection.start, selection.end);
    const next =
      value.slice(0, selection.start) +
      before +
      selected +
      after +
      value.slice(selection.end);
    onChangeText(next);
    const start = selection.start + before.length;
    setSelection({ start, end: start + selected.length });
    input.current?.focus();
  };
  const actions = [
    { name: "Heading", Icon: IconHeading, before: "## ", after: "" },
    { name: "Bold", Icon: IconBold, before: "**", after: "**" },
    { name: "Italic", Icon: IconItalic, before: "*", after: "*" },
    { name: "Quote", Icon: IconBlockquote, before: "> ", after: "" },
    { name: "Code", Icon: IconCode, before: "`", after: "`" },
    { name: "Link", Icon: IconLink, before: "[", after: "](https://)" },
    { name: "Bulleted list", Icon: IconList, before: "- ", after: "" },
    { name: "Numbered list", Icon: IconListNumbers, before: "1. ", after: "" },
    { name: "Task list", Icon: IconListCheck, before: "- [ ] ", after: "" },
  ];
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 7,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {[false, true].map((isPreview) => (
          <Pressable
            key={String(isPreview)}
            accessibilityRole="tab"
            accessibilityState={{ selected: preview === isPreview }}
            onPress={() => setPreview(isPreview)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: preview === isPreview ? 2 : 0,
              borderBottomColor: colors.text,
            }}
          >
            <Text
              style={{
                color: preview === isPreview ? colors.text : colors.textMuted,
                fontFamily: "GeistMedium",
                fontSize: 13,
              }}
            >
              {isPreview ? "Preview" : "Write"}
            </Text>
          </Pressable>
        ))}
      </View>
      {!preview && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <View style={{ flexDirection: "row" }}>
            {actions.map(({ name, Icon, before, after }) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={name}
                onPress={() => format(before, after)}
                style={{
                  minWidth: 38,
                  height: 38,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={17} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      {preview ? (
        <View style={{ minHeight: 150, padding: 12 }}>
          {value.trim() ? (
            <NativeMarkdown
              api={api}
              repo={repo}
              branch={branch}
              colors={colors}
            >
              {value}
            </NativeMarkdown>
          ) : (
            <Text style={{ color: colors.textMuted, fontFamily: "Geist" }}>
              Nothing to preview.
            </Text>
          )}
        </View>
      ) : (
        <TextInput
          ref={input}
          accessibilityLabel={label}
          multiline
          value={value}
          onChangeText={onChangeText}
          selection={selection}
          onSelectionChange={(event) =>
            setSelection(event.nativeEvent.selection)
          }
          placeholder={label}
          placeholderTextColor={colors.textMuted}
          style={{
            minHeight: 150,
            padding: 12,
            textAlignVertical: "top",
            color: colors.text,
            fontFamily: "Geist",
            fontSize: 14,
          }}
        />
      )}
    </View>
  );
}
