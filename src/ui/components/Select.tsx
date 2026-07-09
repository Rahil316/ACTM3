import { type SelectHTMLAttributes, useId } from "react";
import clsx from "clsx";
import { IconChevronDown } from "./icons";
import { InfoTooltip } from "./InfoTooltip";

export type SelectSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<SelectSize, string> = {
  sm: "h-[28px] text-[11px] rounded-[6px] px-2",
  md: "h-[32px] text-[12px] rounded-[7px] px-2",
  lg: "h-[36px] text-[12px] rounded-[8px] px-2",
  xl: "h-[40px] text-[13px] rounded-[8px] p-2",
};

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: SelectOption[];
  size?: SelectSize;
  label?: string;
  tooltip?: string;
  width?: "full" | "flex" | null;
}

export function Select({ options, size = "xl", label, tooltip, width = "full", disabled, className, id: idProp, ...rest }: SelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const widthCls = width === "full" ? "w-full" : width === "flex" ? "flex-1" : "";

  const select = (
    <div className={clsx("relative", widthCls)}>
      <select
        id={id}
        disabled={disabled}
        className={clsx(
          SIZE[size],
          "w-full pr-7",
          "bg-n-sf-input border border-n-br-default text-n-tx-primary",
          "outline-none focus:border-b-br-strong transition-colors",
          "appearance-none cursor-pointer",
          disabled && "opacity-40 cursor-not-allowed pointer-events-none",
          className,
        )}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <IconChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-n-tx-muted pointer-events-none" />
    </div>
  );

  if (!label) return select;

  return (
    <div className={clsx("space-y-1", widthCls, "min-w-0")}>
      <div className="flex items-center gap-1 ml-1">
        <label htmlFor={id} className="text-n-tx-muted text-[12px] font-medium">
          {label}
        </label>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      {select}
    </div>
  );
}
