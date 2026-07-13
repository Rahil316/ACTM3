import { useState } from "react";
import { Badge } from "./Badge";

interface TagInputProps {
  values: number[];
  onChange: (newValues: number[]) => void;
  placeholder?: string;
}

export function TagInput({ values = [], onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const safeValues = Array.isArray(values)
    ? values
    : typeof values === "string"
    ? (values as string)
        .split(",")
        .map((v) => parseInt(v.trim(), 10))
        .filter((v) => !isNaN(v) && v >= 0 && v <= 100)
    : [];

  const addTag = (text: string) => {
    const val = parseInt(text.trim(), 10);
    if (!isNaN(val) && val >= 0 && val <= 100 && !safeValues.includes(val)) {
      const next = [...safeValues, val].sort((a, b) => a - b);
      onChange(next);
    }
    setInputValue("");
  };

  const addTags = (text: string) => {
    const parsed = text
      .split(/[,\s]+/)
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !isNaN(v) && v >= 0 && v <= 100);
    if (parsed.length === 0) return;
    const next = [...new Set([...safeValues, ...parsed])].sort((a, b) => a - b);
    onChange(next);
    setInputValue("");
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (/[,\s]/.test(pasted.trim())) {
      e.preventDefault();
      addTags(pasted);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && safeValues.length > 0) {
      onChange(safeValues.slice(0, -1));
    }
  };

  return (
    <div className="w-full min-h-[36px] bg-n-sf-input border border-n-br-default focus-within:border-b-br-strong rounded-[7px] px-2 py-1.5 flex flex-wrap gap-1.5 items-center transition-colors">
      {safeValues.map((v, i) => (
        <Badge key={i} size="sm" variant="accent" onRemove={() => onChange(safeValues.filter((_, idx) => idx !== i))}>
          {v}%
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        placeholder={safeValues.length === 0 ? placeholder : ""}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue);
          }
        }}
        className="flex-1 min-w-[60px] bg-transparent text-[13px] text-n-tx-primary outline-none border-none p-0 placeholder:text-n-tx-dim"
      />
    </div>
  );
}
