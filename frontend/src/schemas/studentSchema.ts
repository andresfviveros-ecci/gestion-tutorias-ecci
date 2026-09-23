import { z } from 'zod';

export const studentSchema = z.object({
  fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  idNumber: z.string().min(5, 'Número de identificación no válido'),
  career: z.string().optional(),
  email: z.string().email('Correo no válido').refine((val) => val.endsWith('@ecci.edu.co'), {
    message: 'Debe ser correo institucional @ecci.edu.co',
  }),
});

export type StudentFormData = z.infer<typeof studentSchema>;