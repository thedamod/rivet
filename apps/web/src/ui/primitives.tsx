import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type ReactElement,
} from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, GitBranch, Search, X } from "lucide-react";
/** T3's Base UI controls, with the same tooltip geometry and source token roles. */
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function Button({ title, type = "button", ...props }, ref) {
  const button = (
    <button
      ref={ref}
      {...props}
      type={type}
      aria-label={props["aria-label"] || title}
      data-ui-button=""
    />
  );
  return title && !props.disabled ? (
    <Tooltip.Root>
      <Tooltip.Trigger render={button} />
      <Tooltip.Portal>
        <Tooltip.Positioner
          side="top"
          sideOffset={4}
          collisionPadding={5}
          className="t3-tooltip-positioner"
        >
          <Tooltip.Popup className="t3-tooltip" data-slot="tooltip-popup">
            <div>{title}</div>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  ) : (
    button
  );
});
export function Hint({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner
          side="top"
          sideOffset={4}
          collisionPadding={5}
          className="t3-tooltip-positioner"
        >
          <Tooltip.Popup className="t3-tooltip" data-slot="tooltip-popup">
            <div>{label}</div>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
export function PopupProvider({ children }: { children: ReactNode }) {
  return <Tooltip.Provider>{children}</Tooltip.Provider>;
}
export function Modal({
  open,
  onOpenChange,
  title,
  children,
  command = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  command?: boolean;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="t3-dialog-backdrop" />
        <Dialog.Viewport
          className={
            command
              ? "t3-dialog-viewport t3-command-viewport"
              : "t3-dialog-viewport"
          }
        >
          <Dialog.Popup
            ref={popupRef}
            className={command ? "t3-dialog t3-command" : "t3-dialog"}
            data-slot={command ? "command-dialog-popup" : "dialog-popup"}
            initialFocus={() =>
              popupRef.current?.querySelector<HTMLElement>("input,textarea") ||
              true
            }
          >
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            {children}
            {!command && (
              <Dialog.Close className="icon t3-dialog-close" aria-label="Close">
                <X size={16} />
              </Dialog.Close>
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export type CommandItem = {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
};
export function CommandPalette({
  open,
  onOpenChange,
  query,
  onQueryChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  items: CommandItem[];
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    refs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Search" command>
      <div
        className="t3-command-content"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setActive((v) =>
              items.length
                ? (v + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                  items.length
                : 0,
            );
          }
          if (e.key === "Enter") {
            e.preventDefault();
            items[active]?.onSelect();
          }
        }}
      >
        <div className="t3-command-input">
          <Search size={18} />
          <input
            autoFocus
            role="combobox"
            aria-label="Search"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="command-items"
            aria-activedescendant={
              items[active] ? `cmd-${items[active].id}` : undefined
            }
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search…"
          />
          <Button
            className="icon"
            aria-label="Close search"
            onClick={() => onOpenChange(false)}
          >
            <X size={16} />
          </Button>
        </div>
        <div id="command-items" className="t3-command-list" role="listbox">
          {items.map((item, i) => (
            <button
              type="button"
              key={item.id}
              id={`cmd-${item.id}`}
              role="option"
              aria-selected={i === active}
              ref={(node) => {
                refs.current[i] = node;
              }}
              onPointerMove={() => setActive(i)}
              onClick={item.onSelect}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          {!items.length && <div className="t3-command-empty">No results</div>}
        </div>
        <div className="t3-command-footer">
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <kbd>↵</kbd>
          <span />
          <kbd>esc</kbd>
        </div>
      </div>
    </Modal>
  );
}
export function BranchPicker({
  value,
  branches,
  onChange,
}: {
  value: string;
  branches: { name: string }[];
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
    >
      <Menu.Trigger
        render={<Button className="t3-branch-trigger" aria-label="Branch" />}
      >
        <GitBranch size={14} />
        <span>{value}</span>
        <ChevronDown size={14} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          sideOffset={4}
          align="start"
          className="t3-popup-positioner"
        >
          <Menu.Popup className="t3-menu t3-branch-menu" data-slot="menu-popup">
            <div className="t3-menu-search">
              <Search size={16} />
              <input
                ref={input}
                aria-label="Filter branches"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (!["ArrowDown", "ArrowUp", "Escape"].includes(e.key))
                    e.stopPropagation();
                }}
              />
            </div>
            <div className="t3-menu-items">
              {branches
                .filter((b) =>
                  b.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((branch) => (
                  <Menu.Item
                    className="t3-menu-item"
                    key={branch.name}
                    onClick={() => onChange(branch.name)}
                  >
                    <GitBranch size={14} />
                    <span>{branch.name}</span>
                    {branch.name === value && <Check size={14} />}
                  </Menu.Item>
                ))}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
