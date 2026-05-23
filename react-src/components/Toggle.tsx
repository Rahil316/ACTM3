import clsx from 'clsx';

interface ToggleProps {
  id?: string;
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
}

// Controlled toggle pill. Pass `on` state from outside; onChange fires with no args — caller flips state.
export function Toggle({ id, on, onChange, disabled, className }: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      disabled={disabled}
      className={clsx('toggle-pill', on && 'on', disabled && 'opacity-40 cursor-not-allowed', className)}
    />
  );
}
