import { ProfileActivity } from "./ProfileActivity";
import "./profile-activity.css";
import { useHashFields } from "./useHashFields";
import { Button } from "./ui/primitives";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink as ArrowSquareOut,
  BookOpen,
  Star,
  Users,
  MapPin,
  Building2 as Buildings,
  Link as LinkIcon,
  Github as GithubLogo,
} from "lucide-react";
import { decodeContent, type Repository } from "@git-client/github";
import { api, openExternal } from "./api";
import { Empty, ErrorBox, Loading, Markdown, Pager, Time } from "./components";
import { useOpenProfile } from "./navigation";
export function ProfileView({
  login,
  search = "",
  onRepository,
}: {
  login: string;
  onBack: () => void;
  search?: string;
  onRepository: (repo: Repository) => void;
}) {
  const openProfile = useOpenProfile();
  const [location, setLocation] = useHashFields({ section: "overview" });
  const tab = location.section as
    "overview" | "repositories" | "starred" | "followers" | "following";
  const setTab = (section: typeof tab) => setLocation({ section });
  const [page, setPage] = useState(1);
  const user = useQuery({
    queryKey: ["profile", login],
    queryFn: () => api.user(login),
  });
  const repos = useQuery({
    queryKey: ["profile-repos", login, tab, page],
    queryFn: () =>
      tab === "starred"
        ? api.userStarred(login, page)
        : api.userRepositories(login, page),
    enabled: tab === "overview" || tab === "repositories" || tab === "starred",
  });
  const connections = useQuery({
    queryKey: ["profile-connections", login, tab, page],
    queryFn: () =>
      api.userConnections(login, tab as "followers" | "following", page),
    enabled: tab === "followers" || tab === "following",
  });
  const readme = useQuery({
    queryKey: ["profile-readme", login],
    queryFn: () => api.profileReadme(login),
    enabled: tab === "overview",
  });
  const extras = useQuery({
    queryKey: ["profile-extras", login, "overview"],
    queryFn: () => api.profileExtras(login),
    enabled: tab === "overview",
  });
  const filtered = repos.data?.filter((r) =>
    `${r.name} ${r.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const navigate = (value: typeof tab) => {
    setTab(value);
    setPage(1);
  };
  return (
    <div className="profile-page">
      {user.isPending ? (
        <Loading />
      ) : user.error ? (
        <ErrorBox error={user.error} retry={() => user.refetch()} />
      ) : (
        <div className="profile-layout">
          <aside className="profile-identity">
            <img
              className="profile-avatar"
              src={user.data.avatar_url}
              alt={user.data.login}
              width={240}
              height={240}
            />
            <h1>{user.data.name || user.data.login}</h1>
            <p className="profile-login">{user.data.login}</p>
            {user.data.bio && <p className="profile-bio">{user.data.bio}</p>}
            <div className="profile-social">
              <Button onClick={() => navigate("followers")}>
                <Users size={15} />
                <strong>{user.data.followers.toLocaleString()}</strong>
                <span>followers</span>
              </Button>
              <span>·</span>
              <Button onClick={() => navigate("following")}>
                <strong>{user.data.following?.toLocaleString() || 0}</strong>
                <span>following</span>
              </Button>
            </div>
            <div className="profile-facts">
              {user.data.company && (
                <div>
                  <Buildings size={15} />
                  <span>{user.data.company}</span>
                </div>
              )}
              {user.data.location && (
                <div>
                  <MapPin size={15} />
                  <span>{user.data.location}</span>
                </div>
              )}
              {user.data.blog && (
                <Button
                  onClick={() => {
                    const url = user.data.blog!.startsWith("http")
                      ? user.data.blog!
                      : "https://" + user.data.blog;
                    openExternal(url);
                  }}
                >
                  <LinkIcon size={15} />
                  <span>{user.data.blog}</span>
                </Button>
              )}
              <Button onClick={() => openExternal(user.data.html_url)}>
                <GithubLogo size={16} />
                <span>{user.data.login}</span>
                <ArrowSquareOut size={12} />
              </Button>
            </div>
          </aside>
          <div className="profile-main">
            <div
              className="profile-tabs"
              role="tablist"
              aria-label="Profile sections"
            >
              {[
                ["overview", "Overview", BookOpen],
                ["repositories", "Repositories", GithubLogo],
                ["starred", "Starred", Star],
                ["followers", "Followers", Users],
              ].map(([id, label, Icon]) => (
                <Button
                  key={id as string}
                  role="tab"
                  aria-selected={tab === id}
                  aria-label={label as string}
                  title={label as string}
                  className={tab === id ? "active" : ""}
                  onClick={() => navigate(id as typeof tab)}
                >
                  <Icon size={16} />
                  {id === "repositories" && (
                    <span>{user.data.public_repos}</span>
                  )}
                </Button>
              ))}
            </div>
            {tab === "followers" || tab === "following" ? (
              connections.isPending ? (
                <Loading />
              ) : connections.error ? (
                <ErrorBox error={connections.error} />
              ) : (
                <>
                  <div className="profile-people">
                    {connections.data?.map((person) => (
                      <Button
                        key={person.login}
                        onClick={() => openProfile(person.login)}
                      >
                        <img
                          src={person.avatar_url}
                          width={42}
                          height={42}
                          alt=""
                        />
                        <strong>{person.login}</strong>
                        <ArrowSquareOut size={14} />
                      </Button>
                    ))}
                  </div>
                  {!connections.data?.length && <Empty title="No accounts" />}
                  <Pager
                    page={page}
                    setPage={setPage}
                    hasNext={connections.data?.length === 50}
                  />
                </>
              )
            ) : (
              <>
                {tab === "overview" && readme.data?.content && (
                  <div className="profile-readme">
                    <Markdown
                      baseUrl={`https://github.com/${login}/${login}/blob/HEAD/`}
                    >
                      {decodeContent(readme.data.content)}
                    </Markdown>
                  </div>
                )}
                {tab === "overview" && (
                  <ProfileExtrasView
                    data={extras.data}
                    error={extras.error}
                    loading={extras.isPending}
                    onRepository={onRepository}
                  />
                )}
                {readme.error && tab === "overview" && (
                  <ErrorBox error={readme.error} />
                )}
                {repos.isPending ? (
                  <Loading />
                ) : repos.error ? (
                  <ErrorBox error={repos.error} retry={() => repos.refetch()} />
                ) : (
                  <>
                    <div className="profile-repositories">
                      {filtered?.map((r) => (
                        <Button
                          className="profile-repository"
                          key={r.id}
                          onClick={() => onRepository(r)}
                        >
                          <div className="profile-repository-title">
                            <BookOpen size={16} />
                            <strong>{r.name}</strong>
                            {r.fork && <span className="badge">Fork</span>}
                          </div>
                          {r.description && <p>{r.description}</p>}
                          <div className="repo-meta">
                            {r.language && <span>{r.language}</span>}
                            <span>
                              <Star size={12} />
                              {r.stargazers_count}
                            </span>
                            <Time value={r.pushed_at || r.updated_at} />
                          </div>
                        </Button>
                      ))}
                    </div>
                    {!filtered?.length && <Empty title="No repositories" />}
                    <Pager
                      page={page}
                      setPage={setPage}
                      hasNext={repos.data?.length === 50}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileExtrasView({
  data,
  error,
  loading,
  onRepository,
}: {
  data?: import("@git-client/github").ProfileExtras;
  error: unknown;
  loading: boolean;
  onRepository: (r: Repository) => void;
}) {
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;
  return (
    <section className="profile-extras">
      {!!data.pinned.length && (
        <>
          <h2>Pinned</h2>
          <div className="profile-pins">
            {data.pinned.map((r) => (
              <Button
                key={r.id}
                className="profile-pin"
                onClick={() => onRepository(r)}
              >
                <BookOpen size={16} />
                <span>
                  <strong>{r.full_name}</strong>
                  {r.description && <p>{r.description}</p>}
                </span>
                <Star size={12} />
                {r.stargazers_count}
              </Button>
            ))}
          </div>
        </>
      )}
      <ProfileActivity data={data} />
      {data.errors.map((e) => (
        <p className="muted small" key={e}>
          {e}
        </p>
      ))}
    </section>
  );
}
