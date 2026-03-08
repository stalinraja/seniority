import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { useLanguage } from "../i18n/language";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search candidates...",
  className = "",
}: SearchBarProps) {
  const { t } = useLanguage();
  return (
    <div className={`relative w-full ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder === "Search candidates..." ? t("Search candidates...", "விண்ணப்பதாரர்களை தேடுக...") : placeholder}
        className="pl-10 sm:pl-12 pr-3 sm:pr-4 py-5 sm:py-6 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl shadow-sm"
      />
    </div>
  );
}
