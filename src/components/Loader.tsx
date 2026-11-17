type LoaderProps = {
  label?: string;
  size?: "sm" | "md";
};

/** Spinner inline reutilizable para feedback de peticiones HTTP en curso. */
export function Loader({ label, size = "md" }: LoaderProps) {
  return (
    <span className={`loader loader--${size}`} role="status" aria-live="polite">
      <span className="loader-spin" aria-hidden="true" />
      {label && <span className="loader-label">{label}</span>}
    </span>
  );
}
