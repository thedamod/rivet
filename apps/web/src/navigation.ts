import { createContext, useContext } from "react";
export const ProfileNavigation = createContext<(login: string) => void>(
  () => {},
);
export const useOpenProfile = () => useContext(ProfileNavigation);
