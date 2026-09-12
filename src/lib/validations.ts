import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court'),
});

export const RefuelingSchema = z.object({
  vehicle_id: z.number().int().positive(),
  driver_id: z.number().int().positive(),
  liters: z.number().positive('Litres doit être positif'),
  price_per_liter: z.number().positive(),
  total_price: z.number().positive(),
  date: z.string().datetime(),
  odometer: z.number().int().optional(),
  fuel_type: z.enum(['Gasoil', 'Essence', 'E85', 'Électrique']),
  comment: z.string().max(255).optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RefuelingInput = z.infer<typeof RefuelingSchema>;
