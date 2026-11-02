import type { ReactNode } from 'react';

interface StatCardProps {
  etiqueta: string;
  valor: ReactNode;
  detalle: string;
}

/** Métrica compacta sobre fondo mist. */
export const StatCard = ({ etiqueta, valor, detalle }: StatCardProps) => (
  <div className="rounded-2xl bg-mist px-4 py-3.5">
    <p className="text-[11px] font-medium leading-tight text-muted">{etiqueta}</p>
    <p className="mt-1.5 text-[24px] font-semibold leading-none tracking-tight text-tinta">{valor}</p>
    <p className="mt-1.5 text-[10px] text-muted">{detalle}</p>
  </div>
);
