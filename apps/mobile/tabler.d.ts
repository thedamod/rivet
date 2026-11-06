// Same compatibility declaration as T3 AppSymbol.tabler.d.ts: Tabler 3.44's per-icon declaration paths are missing.
declare module "@tabler/icons-react-native/Icon*" {
  import type { Icon } from "@tabler/icons-react-native";
  const icon: Icon;
  export default icon;
}
