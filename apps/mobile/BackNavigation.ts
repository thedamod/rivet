import { createContext } from "react";
export const BackNavigation = createContext<{
  register: (handler: () => boolean) => () => void;
}>({ register: () => () => {} });
