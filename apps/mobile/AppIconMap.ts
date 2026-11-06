import IconGitPullRequestClosed from "@tabler/icons-react-native/IconGitPullRequestClosed";
import IconGitPullRequestDraft from "@tabler/icons-react-native/IconGitPullRequestDraft";
import IconArrowUp from "@tabler/icons-react-native/IconArrowUp";
import IconArrowLeft from "@tabler/icons-react-native/IconArrowLeft";
import IconArrowRight from "@tabler/icons-react-native/IconArrowRight";
import IconAt from "@tabler/icons-react-native/IconAt";
import IconBell from "@tabler/icons-react-native/IconBell";
import IconBook from "@tabler/icons-react-native/IconBook";
import IconBuilding from "@tabler/icons-react-native/IconBuilding";
import IconChecks from "@tabler/icons-react-native/IconChecks";
import IconChevronDown from "@tabler/icons-react-native/IconChevronDown";
import IconChevronLeft from "@tabler/icons-react-native/IconChevronLeft";
import IconChevronRight from "@tabler/icons-react-native/IconChevronRight";
import IconCircle from "@tabler/icons-react-native/IconCircle";
import IconCircleCheck from "@tabler/icons-react-native/IconCircleCheck";
import IconCircleHalf2 from "@tabler/icons-react-native/IconCircleHalf2";
import IconCircleXFilled from "@tabler/icons-react-native/IconCircleXFilled";
import IconClock from "@tabler/icons-react-native/IconClock";
import IconCode from "@tabler/icons-react-native/IconCode";
import IconDots from "@tabler/icons-react-native/IconDots";
import IconExternalLink from "@tabler/icons-react-native/IconExternalLink";
import IconFileDiff from "@tabler/icons-react-native/IconFileDiff";
import IconFileText from "@tabler/icons-react-native/IconFileText";
import IconGitBranch from "@tabler/icons-react-native/IconGitBranch";
import IconGitCommit from "@tabler/icons-react-native/IconGitCommit";
import IconGitMerge from "@tabler/icons-react-native/IconGitMerge";
import IconGitPullRequest from "@tabler/icons-react-native/IconGitPullRequest";
import IconKey from "@tabler/icons-react-native/IconKey";
import IconLink from "@tabler/icons-react-native/IconLink";
import IconLock from "@tabler/icons-react-native/IconLock";
import IconLogout from "@tabler/icons-react-native/IconLogout";
import IconMapPin from "@tabler/icons-react-native/IconMapPin";
import IconMenu2 from "@tabler/icons-react-native/IconMenu2";
import IconMessage from "@tabler/icons-react-native/IconMessage";
import IconPlus from "@tabler/icons-react-native/IconPlus";
import IconRefresh from "@tabler/icons-react-native/IconRefresh";
import IconSettings from "@tabler/icons-react-native/IconSettings";
import IconStar from "@tabler/icons-react-native/IconStar";
import IconStarFilled from "@tabler/icons-react-native/IconStarFilled";
import IconTag from "@tabler/icons-react-native/IconTag";
import IconUserPlus from "@tabler/icons-react-native/IconUserPlus";
import IconUsers from "@tabler/icons-react-native/IconUsers";
import IconX from "@tabler/icons-react-native/IconX";
// Matches T3 AppSymbol: SF Symbols on iOS, Tabler at stroke 2 on Android;
// Git glyphs use the same custom Tabler symbols on both platforms.
export const icons = {
  "git-pull-request-closed": {
    sf: "git.pull-request.closed",
    Icon: IconGitPullRequestClosed,
  },
  "git-pull-request-draft": {
    sf: "git.pull-request.draft",
    Icon: IconGitPullRequestDraft,
  },
  "arrow-up": { sf: "arrow.up", Icon: IconArrowUp },
  "add-outline": { sf: "plus", Icon: IconPlus },
  "arrow-back": { sf: "arrow.left", Icon: IconArrowLeft },
  "arrow-forward": { sf: "arrow.right", Icon: IconArrowRight },
  "at-outline": { sf: "at", Icon: IconAt },
  "book-outline": { sf: "book", Icon: IconBook },
  "business-outline": { sf: "building.2", Icon: IconBuilding },
  "chatbubble-outline": { sf: "bubble.left", Icon: IconMessage },
  "checkmark-circle-outline": { sf: "checkmark.circle", Icon: IconCircleCheck },
  "checkmark-done-outline": { sf: "checkmark", Icon: IconChecks },
  "chevron-back": { sf: "chevron.left", Icon: IconChevronLeft },
  "chevron-forward": { sf: "chevron.right", Icon: IconChevronRight },
  "chevron-down": { sf: "chevron.down", Icon: IconChevronDown },
  close: { sf: "xmark", Icon: IconX },
  "close-outline": { sf: "xmark", Icon: IconX },
  "close-circle-outline": { sf: "xmark.circle.fill", Icon: IconCircleXFilled },
  "code-slash-outline": {
    sf: "chevron.left.forwardslash.chevron.right",
    Icon: IconCode,
  },
  "contrast-outline": { sf: "circle.lefthalf.filled", Icon: IconCircleHalf2 },
  "document-text-outline": { sf: "doc.text", Icon: IconFileText },
  "documents-outline": { sf: "file.diff", Icon: IconFileDiff },
  "ellipse-outline": { sf: "circle", Icon: IconCircle },
  "ellipsis-horizontal": { sf: "ellipsis", Icon: IconDots },
  "git-branch-outline": { sf: "arrow.triangle.branch", Icon: IconGitBranch },
  "git-commit-outline": { sf: "git.commit", Icon: IconGitCommit },
  "git-compare-outline": { sf: "file.diff", Icon: IconFileDiff },
  "git-merge-outline": { sf: "arrow.triangle.merge", Icon: IconGitMerge },
  "git-pull-request-outline": {
    sf: "arrow.triangle.pull",
    Icon: IconGitPullRequest,
  },
  "key-outline": { sf: "key", Icon: IconKey },
  "link-outline": { sf: "link", Icon: IconLink },
  "list-outline": { sf: "line.3.horizontal", Icon: IconMenu2 },
  "location-outline": { sf: "mappin.and.ellipse", Icon: IconMapPin },
  "lock-closed-outline": { sf: "lock", Icon: IconLock },
  "log-out-outline": {
    sf: "rectangle.portrait.and.arrow.right",
    Icon: IconLogout,
  },
  "notifications-outline": { sf: "bell", Icon: IconBell },
  "open-outline": { sf: "safari", Icon: IconExternalLink },
  "people-outline": { sf: "person.2", Icon: IconUsers },
  "person-add-outline": { sf: "person.badge.plus", Icon: IconUserPlus },
  "pricetag-outline": { sf: "tag", Icon: IconTag },
  "refresh-outline": { sf: "arrow.clockwise", Icon: IconRefresh },
  "settings-outline": { sf: "gearshape", Icon: IconSettings },
  star: { sf: "star.fill", Icon: IconStarFilled },
  "star-outline": { sf: "star", Icon: IconStar },
  "time-outline": { sf: "clock", Icon: IconClock },
} as const;
export type AppIconName = keyof typeof icons;
