import { useState } from "react";
import { Badge } from "./Badge";

interface TagInputProps {
  values: number[];
  onChange: (newValues: number[]) => void;
  placeholder?: string;
}

export function TagInput({ values = [], onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (text: string) => {
    const val = parseInt(text.trim(), 10);
    if (!isNaN(val) && val >= 0 && val <= 100 && !values.includes(val)) {
      const next = [...values, val].sort((a, b) => a - b);
      onChange(next);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="w-full min-h-[36px] bg-bg-input border border-border-input focus-within:border-border-focus rounded-[7px] px-2 py-1.5 flex flex-wrap gap-1.5 items-center transition-colors">
      {values.map((v, i) => (
        <Badge key={i} size="sm" variant="accent" onRemove={() => onChange(values.filter((_, idx) => idx !== i))}>
          {v}%
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        placeholder={values.length === 0 ? placeholder : ""}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue);
          }
        }}
        className="flex-1 min-w-[60px] bg-transparent text-[13px] text-text-primary outline-none border-none p-0 placeholder:text-text-dim"
      />
    </div>
  );
}
