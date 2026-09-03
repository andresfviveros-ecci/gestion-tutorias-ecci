export type UserRole = 'Administrador' | 'Tutor' | 'Estudiante';

export interface Estudiante {
  id?: string;
  fullName: string;
  idNumber: string;
  career?: string;
  email: string;
  phone?: string;
}

export interface User {
  email: string;
  name: string;
  role: UserRole;
}