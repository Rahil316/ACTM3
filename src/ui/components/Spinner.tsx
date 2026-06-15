import clsx from "clsx";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: "w-5 h-5 border-2",
  md: "w-8 h-8 border-[3px]",
  lg: "w-12 h-12 border-4",
};

export function Spinner({ size = "lg", className }: SpinnerProps) {
  return (
    <div
      className={clsx(
        SIZE[size],
        "border-b-fi-btn-default border-t-transparent rounded-full animate-spin",
        className,
      )}
    />
  );
}

export function SectionSpinner({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={clsx("flex flex-col items-center justify-center gap-3 py-10", className)}>
      <Spinner size="md" />
      {message && <p className="text-[12px] text-n-tx-muted">{message}</p>}
    </div>
  );
}
