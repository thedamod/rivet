import { NativeProfileExtras } from "./ProfileExtras";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppIcon } from "./AppIcon";
import { useQuery } from "@tanstack/react-query";
import {
  decodeContent,
  type GitHubClient,
  type Repository,
} from "@git-client/github";
import { NativeMarkdown } from "./Markdown";
type Palette = {
  canvas: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
};
export function NativeProfileView({
  login,
  api,
  colors,
  onProfile,
  onRepository,
  search = "",
}: {
  login: string;
  search?: string;
  api: GitHubClient;
  colors: Palette;
  onProfile: (login: string) => void;
  onRepository: (repo: Repository) => void;
}) {
  const [tab, setTab] = useState<
    "repositories" | "starred" | "followers" | "following"
  >("repositories");
  const [page, setPage] = useState(1);
  const user = useQuery({
    queryKey: ["user", login],
    queryFn: () => api.user(login),
  });
  const repos = useQuery({
    queryKey: ["user-repositories", login, tab, page],
    queryFn: () =>
      tab === "starred"
        ? api.userStarred(login, page)
        : api.userRepositories(login, page),
    enabled: tab === "repositories" || tab === "starred",
  });
  const people = useQuery({
    queryKey: ["user-connections", login, tab, page],
    queryFn: () =>
      api.userConnections(
        login,
        tab === "following" ? "following" : "followers",
        page,
      ),
    enabled: tab === "followers" || tab === "following",
  });
  const readme = useQuery({
    queryKey: ["profile-readme", login],
    queryFn: () => api.profileReadme(login),
    enabled: tab === "repositories",
  });
  const text = (value: React.ReactNode, muted = false, extra?: object) => (
    <Text
      style={[s.text, { color: muted ? colors.textMuted : colors.text }, extra]}
    >
      {value}
    </Text>
  );
  const action = (
    icon: keyof typeof AppIcon.glyphMap,
    label: string,
    fn: () => void,
    active = false,
  ) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={fn}
      style={[s.icon, active && { backgroundColor: colors.surface }]}
    >
      <AppIcon
        name={icon}
        size={19}
        color={active ? colors.text : colors.textMuted}
      />
    </Pressable>
  );
  if (user.isPending)
    return <ActivityIndicator color={colors.textMuted} style={{ flex: 1 }} />;
  if (user.error)
    return <View style={s.content}>{text(user.error.message, true)}</View>;
  const u = user.data!;
  const current = tab === "repositories" || tab === "starred" ? repos : people;
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.identity}>
        <Image source={{ uri: u.avatar_url }} style={s.avatar} />
        <View style={{ flex: 1, gap: 2 }}>
          {text(u.name || u.login, false, s.name)}
          {text("@" + u.login, true, { fontSize: 15 })}
        </View>
        {action("open-outline", "Open on GitHub", () =>
          Linking.openURL(u.html_url),
        )}
      </View>
      {!!u.bio && text(u.bio, false, { lineHeight: 23 })}
      {u.company && (
        <View style={s.meta}>
          <AppIcon name="business-outline" size={15} color={colors.textMuted} />
          {text(u.company, true)}
        </View>
      )}
      {u.location && (
        <View style={s.meta}>
          <AppIcon name="location-outline" size={15} color={colors.textMuted} />
          {text(u.location, true)}
        </View>
      )}
      {!!u.blog && (
        <Pressable
          style={s.meta}
          accessibilityRole="link"
          accessibilityLabel={u.blog}
          onPress={() => {
            const url = /^https?:\/\//.test(u.blog!)
              ? u.blog!
              : "https://" + u.blog;
            Linking.openURL(url);
          }}
        >
          <AppIcon name="link-outline" size={15} color={colors.textMuted} />
          {text(u.blog, true)}
        </Pressable>
      )}
      <View style={s.counts}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setTab("followers");
            setPage(1);
          }}
        >
          {text(`${u.followers.toLocaleString()} followers`, true)}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setTab("following");
            setPage(1);
          }}
        >
          {text(`${(u.following || 0).toLocaleString()} following`, true)}
        </Pressable>
      </View>
      <View style={[s.tabs, { borderBottomColor: colors.border }]}>
        {action(
          "book-outline",
          "Repositories",
          () => {
            setTab("repositories");
            setPage(1);
          },
          tab === "repositories",
        )}
        {action(
          "star-outline",
          "Starred",
          () => {
            setTab("starred");
            setPage(1);
          },
          tab === "starred",
        )}
        {action(
          "people-outline",
          "Followers",
          () => {
            setTab("followers");
            setPage(1);
          },
          tab === "followers",
        )}
        {action(
          "person-add-outline",
          "Following",
          () => {
            setTab("following");
            setPage(1);
          },
          tab === "following",
        )}
        <View style={{ flex: 1 }} />
        {tab === "repositories" && text(u.public_repos.toLocaleString(), true)}
      </View>
      {tab === "repositories" && readme.data?.content && (
        <NativeMarkdown
          api={api}
          colors={colors}
          repo={`${login}/${login}`}
          branch="HEAD"
        >
          {decodeContent(readme.data.content)}
        </NativeMarkdown>
      )}
      {tab === "repositories" && (
        <>
          <NativeProfileExtras
            api={api}
            login={login}
            colors={colors}
            onRepository={onRepository}
          />
          {readme.error && text(readme.error.message, true)}
        </>
      )}
      {current.isPending ? (
        <ActivityIndicator color={colors.textMuted} style={{ height: 160 }} />
      ) : current.error ? (
        text(current.error.message, true)
      ) : tab === "repositories" || tab === "starred" ? (
        repos.data
          ?.filter((repo) =>
            `${repo.name} ${repo.description || ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((repo) => (
            <Pressable
              key={repo.id}
              accessibilityRole="button"
              onPress={() => onRepository(repo)}
              style={[s.row, { borderBottomColor: colors.border }]}
            >
              <AppIcon name="book-outline" size={18} color={colors.textMuted} />
              <View style={{ flex: 1, gap: 5 }}>
                {text(repo.name, false, {
                  fontFamily: "GeistMedium",
                  fontSize: 14,
                })}
                {!!repo.description &&
                  text(repo.description, true, {
                    fontSize: 12,
                    lineHeight: 19,
                  })}
                <View style={s.meta}>
                  {text(repo.language || "", true, { fontSize: 11 })}
                  <AppIcon
                    name="star-outline"
                    size={11}
                    color={colors.textMuted}
                  />
                  {text(repo.stargazers_count.toLocaleString(), true, {
                    fontSize: 11,
                  })}
                </View>
              </View>
              <AppIcon
                name="chevron-forward"
                size={14}
                color={colors.textMuted}
              />
            </Pressable>
          ))
      ) : (
        people.data?.map((person) => (
          <Pressable
            key={person.login}
            accessibilityRole="button"
            onPress={() => onProfile(person.login)}
            style={[s.row, { borderBottomColor: colors.border }]}
          >
            <Image source={{ uri: person.avatar_url }} style={s.personAvatar} />
            {text(person.login, false, { fontFamily: "GeistMedium" })}
          </Pressable>
        ))
      )}
      {!current.isPending &&
        !current.error &&
        !current.data?.length &&
        text("No results", true)}
      <View style={s.pager}>
        {action("chevron-back", "Previous page", () =>
          setPage((v) => Math.max(1, v - 1)),
        )}
        {text(page, true)}
        {action("chevron-forward", "Next page", () => {
          if (current.data?.length === 50) setPage((v) => v + 1);
        })}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  text: { fontFamily: "Geist", fontSize: 16, lineHeight: 23 },
  lookup: { flexDirection: "row", alignItems: "center", gap: 8 },
  lookupInput: {
    flex: 1,
    fontFamily: "Geist",
    fontSize: 15,
    paddingVertical: 10,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 8,
  },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  name: { fontFamily: "GeistSemiBold", fontSize: 23, lineHeight: 30 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  counts: { flexDirection: "row", gap: 18, marginVertical: 6 },
  icon: {
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    paddingBottom: 7,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 17,
    borderBottomWidth: 1,
  },
  personAvatar: { width: 40, height: 40, borderRadius: 20 },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 15,
  },
});
