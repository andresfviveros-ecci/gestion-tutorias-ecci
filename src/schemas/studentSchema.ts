import { z } from 'zod';

export const studentSchema = z.object({
  fullName: z.string().min(3, 'Mínimo 3 caracteres'),
  idNumber: z.string().min(5, 'N.° de identificación requerido'),
  career: z.string().optional(),
  email: z.string().email('Correo inválido').refine((e) => e.endsWith('@ecci.edu.co'), {
    message: 'Debe ser correo institucional @ecci.edu.co',
  }),
  phone: z.string().optional(),
});

export type StudentFormData = z.infer<typeof studentSchema>;