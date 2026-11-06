# Git Client

An Electron and Expo React Native GitHub client. T3 Code's light/dark palettes, compact layout rules, and file icon mappings are adapted from the reference checkout at `context/t3code` (commit `c22251163132534c4f2048ac35bad8caad0708db`). Geist Sans and Geist Mono are bundled. Pierre Diffs and Trees render code, patches, and files.

## Run

Requires Node 24 and npm 11. Run `npm install` from this directory; installation also builds the offline mobile viewer.

- `npm run dev`: web client at http://127.0.0.1:5173
- `npm run desktop`: Vite and Electron together
- `npm run mobile`: Expo development server for iOS and Android
- `npm run package:desktop`: unpacked desktop application in `release/`
- `npm run export -w @git-client/mobile`: native Metro/Hermes bundles

Desktop/web authenticates through the local GitHub CLI (`gh auth login`) or `GH_TOKEN`. The renderer never receives that token. The local development proxy accepts same-origin requests carrying the application's request marker. Packaged Electron uses an isolated preload API. GitHub CLI must also be installed to clone repositories.

Mobile accepts a personal access token through the connection screen and stores it in Expo SecureStore. Repository read permissions enable browsing; write permissions are needed for creating issues and comments; user starring permissions enable stars. Notifications require a token supporting the notifications API. Organization access depends on token grants and SSO authorization. CI details need Checks and Commit statuses read access; unavailable check permissions are isolated to the checks section. Merge actions need repository write access, respect repository merge methods, ask for confirmation, and send the displayed head SHA.

## Clients and shared packages

`apps/web` contains the web renderer and development API proxy. `apps/desktop` contains the sandboxed Electron shell and GitHub gateway. `apps/mobile` contains the native application. Shared packages own the typed GitHub client, theme tokens/file icons, sanitized Markdown, and offline Pierre viewer build.

The interface uses top navigation and icon actions. Repository READMEs precede the file tree. Folders expand in place; opening a file retains the expanded tree beside a separate preview, with a drawer on narrow native screens. The tree and file contents share one commit snapshot. The mobile repository toolbar keeps branch selection, section icons, and overflow actions on one row. PRs use flat summary, timeline, and code views; the GitHub body is rendered directly with sanitized HTML support, including tables and authenticated repository images. Reviewers, labels, checks, files, and timeline entries come from GitHub. Mobile PRs use Overview and Activity with a grouped merge/check/review panel, a collapsible description, an attachment gallery, and changed files below it. The activity list supports filtering and ordering. PR titles and details remain sticky while scrolling. Profile pages are available from account avatars, PR authors, and repository owners, with user lookup, profile READMEs, repositories, stars, and follower/following lists.

Lists paginate. Code previews support branches and UTF-8 source, Markdown, images/SVGs, PDFs, audio and video. Media preview downloads are limited to 25 MB. Unsupported/binary formats can be opened through GitHub or the mobile share sheet. PDF embedding is platform dependent; the share sheet is the fallback. Native syntax highlighting ships 17 grammars; uncommon language files remain readable as text. No offline repository cache or editing/sync engine is implemented.

## Verification

`npm run typecheck` checks web/shared and native TypeScript. `npm test` covers the API boundary, branch/path encoding, auth errors, writes, media formats, and sanitized Markdown. Set `TEST_BASE_URL=http://127.0.0.1:5173` to also check the development proxy boundary.

Linux desktop packaging and iOS/Android bundle export are supported. Physical-device behavior, signed installers, macOS notarization, and Windows packaging require platform testing. Builds and bundle exports alone do not establish those runtime results.

Navigation uses URL-backed history on web and desktop, including repository sections, branches, selected files, profile tabs and PR tabs. Electron supports browser Back/Forward commands and Alt+Arrow shortcuts. Native supports Android back and an edge swipe to return, closing an open file before leaving its repository. PR headers condense on scroll. Summary comments and timeline bot comments can be collapsed and filtered. Profiles load their README, pinned repositories and yearly contribution/commit activity through GitHub APIs; inaccessible data is reported instead of being replaced with sample data.
