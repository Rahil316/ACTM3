import { LucideCheck as Check } from "./icons";
import clsx from "clsx";

interface CheckboxProps {
  checked: boolean;
  className?: string;
}

export function Checkbox({ checked, className }: CheckboxProps) {
  return (
    <div
      className={clsx(
        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
        checked
          ? "bg-b-fi-btn-default border-b-fi-btn-default"
          : "border-n-br-strong bg-n-sf-input",
        className,
      )}
    >
      {checked && <Check size={10} strokeWidth={3} className="text-b-tx-btn-default" />}
    </div>
  );
}
