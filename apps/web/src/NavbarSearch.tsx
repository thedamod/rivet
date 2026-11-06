import { useId, useState, type ReactNode } from "react";
import { Search, X, BookOpen, UserRound } from "lucide-react";
import type { Repository } from "@rivet/github";
import { Button } from "./ui/primitives";
export function NavbarSearch({
  value,
  onChange,
  repositories,
  sections,
  onRepository,
  onProfile,
}: {
  value: string;
  onChange: (value: string) => void;
  repositories: Repository[];
  sections: {
    id: string;
    label: string;
    icon: ReactNode;
    onSelect: () => void;
  }[];
  onRepository: (repo: Repository) => void;
  onProfile: (login: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const q = value.trim().toLowerCase();
  const items = [
    ...sections.filter((s) => s.label.toLowerCase().includes(q)),
    ...repositories
      .filter((r) => r.full_name.toLowerCase().includes(q))
      .slice(0, 8)
      .map((r) => ({
        id: String(r.id),
        label: r.full_name,
        icon: <BookOpen size={14} />,
        onSelect: () => onRepository(r),
      })),
    ...(/^@?[a-z\d](?:[a-z\d-]{0,38})$/i.test(value.trim())
      ? [
          {
            id: "profile",
            label: `@${value.trim().replace(/^@/, "")}`,
            icon: <UserRound size={14} />,
            onSelect: () => onProfile(value.trim().replace(/^@/, "")),
          },
        ]
      : []),
  ];
  const visible = open && !!q;
  const choose = (index: number) => {
    items[index]?.onSelect();
    setOpen(false);
  };
  return (
    <div className="navbar-search">
      <Search size={15} />
      <input
        id="global-search"
        role="combobox"
        aria-label="Search"
        aria-autocomplete="list"
        aria-expanded={visible && items.length > 0}
        aria-controls={id}
        aria-activedescendant={
          visible && items[active] ? `${id}-${items[active].id}` : undefined
        }
        value={value}
        placeholder="Search…"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            e.currentTarget.blur();
          }
          if (visible && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setActive(
              (i) =>
                (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                Math.max(1, items.length),
            );
          }
          if (visible && e.key === "Enter") {
            e.preventDefault();
            choose(active);
          }
        }}
      />
      {value && (
        <Button
          className="icon"
          title="Clear search"
          onClick={() => onChange("")}
        >
          <X size={13} />
        </Button>
      )}
      {visible && !!items.length && (
        <div className="navbar-search-results t3-menu" id={id} role="listbox">
          {items.map((item, i) => (
            <button
              key={item.id}
              id={`${id}-${item.id}`}
              role="option"
              aria-selected={i === active}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onPointerMove={() => setActive(i)}
              onClick={() => choose(i)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
