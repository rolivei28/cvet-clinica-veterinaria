import { Hono } from 'hono';
import { petRepository } from '../repositories/pet.repository.js';

export const petsRoutes = new Hono().get('/', async (c) => {
  const pets = await petRepository.listarComTutor();
  return c.json(pets);
});
