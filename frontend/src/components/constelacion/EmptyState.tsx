interface EmptyStateProps {
  titulo: string;
  detalle: string;
}

/** Estado vacío con borde punteado. */
export const EmptyState = ({ titulo, detalle }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-faint px-6 py-10 text-center">
    <p className="text-[13px] font-medium text-slate-ink">{titulo}</p>
    <p className="text-[11px] text-muted">{detalle}</p>
  </div>
);
