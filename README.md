# Git Client

An Electron and Expo React Native GitHub client. T3 Code's light/dark palettes, compact layout rules, and file icon mappings are adapted from the reference checkout at `context/t3code` (commit `c22251163132534c4f2048ac35bad8caad0708db`). Geist Sans and Geist Mono are bundled. Pierre Diffs and Trees render code, patches, and files.

## Run

Requires Node 24 and npm 11. Run `npm install` from this directory; installation also builds the offline mobile viewer.

- `npm run dev`: web client on `0.0.0.0:5173` (open http://localhost:5173)
- `npm run desktop`: Vite and Electron together
- `npm run mobile`: Expo development server for iOS and Android
- `npm run package:desktop`: unpacked desktop application in `release/`
- `npm run export -w @git-client/mobile`: native Metro/Hermes bundles

## GitHub OAuth

Register a [GitHub OAuth App](https://github.com/settings/applications/new) using these development settings:

- Application name: `Git Client`
- Homepage URL: `http://localhost:5173`
- Authorization callback URL: `http://127.0.0.1:5173`
- Enable Device Flow: checked
- Expire user access tokens: keep enabled; session refresh is implemented

Click **Register application**, then copy its public **Client ID** into the root `github-oauth.json`:

```json
{ "clientId": "YOUR_PUBLIC_CLIENT_ID" }
```

GitHub requires a callback URL during registration; `http://127.0.0.1:5173` is suitable for development. Device authorization does not use this callback. No client secret is required or bundled. Restart development servers after changing the client ID and rebuild packaged clients. Desktop/web can override the ID with `GIT_CLIENT_GITHUB_CLIENT_ID`; Expo can override it with `EXPO_PUBLIC_GITHUB_CLIENT_ID` in `apps/mobile/.env`.

Select **Sign in with GitHub**, then enter the displayed verification code on GitHub and approve access. Web opens GitHub when **Continue on GitHub** is selected; desktop/mobile use the system browser. Authorization completes in the app automatically. All clients use GitHub's [OAuth device flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow), including expiring-token refresh when GitHub issues refresh tokens. PAT entry, environment-token fallback, and reuse of `gh auth` credentials have been removed. Existing mobile PATs are discarded on startup.

Requested scopes are `repo`, `read:user`, `read:org`, and `notifications`: private repository access and repository writes (issues, comments, merges), profiles, organization membership, and notifications. OAuth scopes are broader than fine-grained PAT permissions; GitHub displays them for approval. Organization SSO and OAuth application restrictions still apply. Merge actions respect repository merge methods, ask for confirmation, and send the displayed head SHA. Unavailable CI permissions remain scoped to the checks section.

Electron stores the OAuth session encrypted with the OS keyring through `safeStorage`; a locked or unavailable keyring requires unlocking before sign-in can complete. Access and refresh tokens stay in the main process. Cloning requires Git and uses a temporary credential helper scoped to github.com, with the OAuth credential passed only through the child-process environment. Tokens are not embedded in remote URLs or saved to Git configuration. Mobile stores OAuth credentials in Expo SecureStore. The development web server keeps credentials only in memory, isolated by an HttpOnly, SameSite cookie; restarting it requires browser sign-in again. Its API requires the application's request marker and rejects cross-origin requests. The Vite server is for development, not production hosting.

Sign out removes the local OAuth session and cached account data. To revoke the app's GitHub authorization as well, use [Authorized OAuth Apps](https://github.com/settings/applications). No credentials belong in `github-oauth.json`; its client ID is public.

## Clients and shared packages

`apps/web` contains the web renderer and development API proxy. `apps/desktop` contains the sandboxed Electron shell and GitHub gateway. `apps/mobile` contains the native application. Shared packages own the typed GitHub client, theme tokens/file icons, sanitized Markdown, and offline Pierre viewer build.

The interface uses top navigation and icon actions. Repository READMEs precede the file tree. Folders expand in place; opening a file retains the expanded tree beside a separate preview, with a drawer on narrow native screens. The tree and file contents share one commit snapshot. The mobile repository toolbar keeps branch selection, section icons, and overflow actions on one row. PRs use flat summary, timeline, and code views; the GitHub body is rendered directly with sanitized HTML support, including tables and authenticated repository images. Reviewers, labels, checks, files, and timeline entries come from GitHub. Mobile PRs use Overview and Activity with a grouped merge/check/review panel, a collapsible description, an attachment gallery, and changed files below it. The activity list supports filtering and ordering. PR titles and details remain sticky while scrolling. Profile pages are available from account avatars, PR authors, and repository owners, with user lookup, profile READMEs, repositories, stars, and follower/following lists.

Lists paginate. Code previews support branches and UTF-8 source, Markdown, images/SVGs, PDFs, audio and video. Media preview downloads are limited to 25 MB. Unsupported/binary formats can be opened through GitHub or the mobile share sheet. PDF embedding is platform dependent; the share sheet is the fallback. Native syntax highlighting ships 17 grammars; uncommon language files remain readable as text. No offline repository cache or editing/sync engine is implemented.

## Verification

`npm run typecheck` checks web/shared and native TypeScript. `npm test` covers the API boundary, branch/path encoding, auth errors, writes, media formats, and sanitized Markdown. Set `TEST_BASE_URL=http://127.0.0.1:5173` to also check the development proxy boundary.

Linux desktop packaging and iOS/Android bundle export are supported. Physical-device behavior, signed installers, macOS notarization, and Windows packaging require platform testing. Builds and bundle exports alone do not establish those runtime results.

Navigation uses URL-backed history on web and desktop, including repository sections, branches, selected files, profile tabs and PR tabs. Electron supports browser Back/Forward commands and Alt+Arrow shortcuts. Native supports Android back and an edge swipe to return, closing an open file before leaving its repository. PR headers condense on scroll. Summary comments and timeline bot comments can be collapsed and filtered. Profiles load their README, pinned repositories and yearly contribution/commit activity through GitHub APIs; inaccessible data is reported instead of being replaced with sample data.

The navbar provides the single search field and Back action. Shared Markdown editors provide formatting and Write/Preview modes for comments and issue descriptions. Empty mobile issue lists provide creation, including a writable-repository picker from the global Issues view. Profile contribution activity is grouped by month and repository. Repository file opening and closure use scoped transitions with reduced-motion support and restore the browsing position when returning to the README/tree view.
