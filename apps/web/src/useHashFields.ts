import { useEffect, useRef, useState } from "react";
export function useHashFields<T extends Record<string, string>>(defaults: T) {
  const read = () => {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    return Object.fromEntries(
      Object.entries(defaults).map(([k, v]) => [k, params.get(k) ?? v]),
    ) as T;
  };
  const [value, setValue] = useState<T>(read);
  const current = useRef(value);
  current.current = value;
  useEffect(() => {
    const restore = () => setValue(read());
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const update = (patch: Partial<T>) => {
    const next = { ...current.current, ...patch };
    if (Object.keys(next).every((k) => next[k] === current.current[k])) return;
    current.current = next;
    setValue(next);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next))
      if (v !== defaults[k]) params.set(k, v);
    const hash = location.hash.split("?")[0];
    const depth = (history.state?.depth || 0) + 1;
    history.pushState(
      { ...history.state, depth },
      "",
      hash + (params.size ? "?" + params : ""),
    );
  };
  return [value, update] as const;
}
