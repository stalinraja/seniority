import { Filter } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { DropdownFilter } from "./DropdownFilter";
import { cn } from "./ui/utils";
import { useLanguage } from "../i18n/language";

export interface FilterGroup {
  key: string;
  title: string;
  items: string[];
}

interface FilterSidebarProps {
  groups: FilterGroup[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (category: string, value: string, checked: boolean) => void;
  onClearAll: () => void;
  className?: string;
  compact?: boolean;
}

export function FilterSidebar({
  groups,
  selectedFilters,
  onFilterChange,
  onClearAll,
  className,
  compact = false,
}: FilterSidebarProps) {
  const { t } = useLanguage();
  const hasActiveFilters = Object.values(selectedFilters).some((v) => v.length > 0);

  if (compact) {
    return (
      <aside className={cn("filter-sidebar w-full glass-panel border border-gray-200 rounded-lg relative z-[2147482000] overflow-visible", className)}>
        <div className="filter-sidebar__header px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-900 text-sm">{t("Filters", "வடிகட்டிகள்")}</h2>
              <p className="text-xs text-slate-600 hidden sm:block">
                {t("Active", "செயலில்")}: {Object.values(selectedFilters).reduce((sum, values) => sum + values.length, 0)}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={onClearAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {t("Clear All", "அனைத்தையும் நீக்கு")}
              </button>
            )}
          </div>
        </div>
        <div className="px-4 py-3 flex items-end gap-3 overflow-x-auto overflow-y-visible pb-2 relative">
          {groups.map((group) => (
            <DropdownFilter
              key={group.key}
              title={group.title}
              items={group.items}
              selectedItems={selectedFilters[group.key] || []}
              onChange={(value, checked) => onFilterChange(group.key, value, checked)}
              compact
            />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn("filter-sidebar w-full lg:w-80 glass-panel border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col lg:h-full", className)}>
      <div className="filter-sidebar__header p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">{t("Filters", "வடிகட்டிகள்")}</h2>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t("Clear All", "அனைத்தையும் நீக்கு")}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-600">
          {t(
            "Use one or more groups to narrow the seniority list quickly.",
            "மூப்பு பட்டியலை விரைவாக குறைக்க ஒரு அல்லது அதற்கு மேற்பட்ட குழுக்களை பயன்படுத்தவும்."
          )}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {groups.map((group) => (
            <DropdownFilter
              key={group.key}
              title={group.title}
              items={group.items}
              selectedItems={selectedFilters[group.key] || []}
              onChange={(value, checked) => onFilterChange(group.key, value, checked)}
            />
          ))}
        </div>
      </ScrollArea>
      <div className="filter-sidebar__footer px-4 sm:px-6 py-3 border-t border-gray-200">
        <p className="text-xs text-slate-700">
          {t("Active filters", "செயலில் உள்ள வடிகட்டிகள்")}:{" "}
          <span className="font-semibold text-sky-700">
            {Object.values(selectedFilters).reduce((sum, values) => sum + values.length, 0)}
          </span>
        </p>
      </div>
    </aside>
  );
}
