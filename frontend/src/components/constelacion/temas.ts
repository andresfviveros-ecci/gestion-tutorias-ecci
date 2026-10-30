/**
 * Paleta de acentos del sistema Constelación.
 * Cada materia recibe un color estable a partir de su id.
 */

export interface TemaTarjeta {
  bg: string;
  text: string;
  dot: string;
}

export const PALETA: TemaTarjeta[] = [
  { bg: 'bg-terracota', text: 'text-white', dot: 'bg-terracota' },
  { bg: 'bg-carbon', text: 'text-white', dot: 'bg-carbon' },
  { bg: 'bg-salvia', text: 'text-tinta', dot: 'bg-salvia' },
  { bg: 'bg-arena', text: 'text-tinta', dot: 'bg-arena' },
  { bg: 'bg-cacao', text: 'text-white', dot: 'bg-cacao' },
];

export const temaDeMateria = (materiaId: number): TemaTarjeta =>
  PALETA[Math.abs(materiaId - 1) % PALETA.length];

export const temaPorIndice = (indice: number): TemaTarjeta =>
  PALETA[Math.abs(indice) % PALETA.length];
