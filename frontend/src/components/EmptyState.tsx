export default function EmptyState({
  title = "Sin registros",
  subtitle = "No hay datos para mostrar. Cuando se conecte el backend, esta sección se poblará automáticamente.",
  actionLabel,
  onAction
}: {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div style={{
      padding: "2rem",
      border: "1px dashed var(--grey-200)",
      borderRadius: "14px",
      background: "#fff",
      textAlign: "center",
      color: "var(--grey-600)"
    }}>
      <div style={{fontSize:"1.1rem", fontWeight:800, color:"var(--blue-900)", marginBottom:".3rem"}}>{title}</div>
      <div style={{marginBottom:".8rem"}}>{subtitle}</div>
      {actionLabel && onAction && (
        <button onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
