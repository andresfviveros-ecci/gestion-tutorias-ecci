import { z } from 'zod';
import { esCorreoPermitido, MENSAJE_DOMINIO } from '../config';

export const studentSchema = z.object({
  fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  idNumber: z.string().min(5, 'Número de identificación no válido'),
  career: z.string().optional(),
  email: z.string().email('Correo no válido').refine(esCorreoPermitido, {
    message: MENSAJE_DOMINIO,
  }),
});

export type StudentFormData = z.infer<typeof studentSchema>;