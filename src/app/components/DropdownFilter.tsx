import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { useLanguage } from "../i18n/language";

interface DropdownFilterProps {
  title: string;
  items: string[];
  selectedItems: string[];
  onChange: (value: string, checked: boolean) => void;
  compact?: boolean;
  className?: string;
}

export function DropdownFilter({
  title,
  items,
  selectedItems,
  onChange,
  compact = false,
  className = "",
}: DropdownFilterProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
  const filteredItems = items.filter((item) => item.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!open) return;

    function syncMenuPosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }

    syncMenuPosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideTrigger = !!ref.current && ref.current.contains(target);
      const clickedInsideMenu = !!menuRef.current && menuRef.current.contains(target);
      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setOpen(false);
      }
    }

    function handleReposition() {
      syncMenuPosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div
      className={`${compact ? "mb-0 shrink-0 w-[190px] sm:w-[210px]" : "mb-4"} ${open ? "relative z-[2147483000]" : "relative z-20"} ${className}`}
      ref={ref}
    >
      <h3 className={`${compact ? "font-medium text-gray-900 mb-1 text-xs" : "font-medium text-gray-900 mb-2"}`}>{title}</h3>
      <div className="relative">
        <button
          ref={triggerRef}
          className={`filter-dropdown__trigger w-full border rounded text-left ${compact ? "px-2.5 py-1.5 text-sm" : "px-3 py-2"}`}
          onClick={() => setOpen((o) => !o)}
        >
          {selectedItems.length
            ? t(`${selectedItems.length} selected`, `${selectedItems.length} தேர்வு செய்யப்பட்டது`)
            : t(`Select ${title}`, `${title} தேர்வு செய்க`)}
        </button>
        {open &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={menuRef}
              className="filter-dropdown__menu fixed z-[2147483647] border rounded shadow-lg max-h-60 overflow-auto bg-white dark:bg-slate-900"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
              }}
            >
              <Input
                placeholder={t(`Search ${title}`, `${title} தேடு`)}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2"
              />
              <div className="space-y-2 px-2">
                {filteredItems.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Checkbox
                      id={`${title}-${item}`}
                      checked={selectedItems.includes(item)}
                      onCheckedChange={(checked: CheckedState) => onChange(item, checked === true)}
                    />
                    <Label htmlFor={`${title}-${item}`} className="text-sm text-gray-700 dark:text-slate-200 cursor-pointer">
                      {item}
                    </Label>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="text-gray-500 dark:text-slate-300 text-sm px-2 py-1">
                    {t("No results", "முடிவுகள் இல்லை")}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
