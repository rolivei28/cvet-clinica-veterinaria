import { timingSafeEqual, scryptSync } from 'node:crypto';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { usuarioRepository } from '../repositories/usuario.repository.js';

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

function senhaConfere(senha: string, senhaHash: string) {
  const [salt, expectedHash] = senhaHash.split(':');
  if (!salt || !expectedHash) return false;

  const expected = Buffer.from(expectedHash, 'hex');
  const received = scryptSync(senha, salt, 64);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export const authRoutes = new Hono().post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, senha } = c.req.valid('json');
  const usuario = await usuarioRepository.buscarPorEmail(email.toLowerCase());

  if (!usuario || !senhaConfere(senha, usuario.senhaHash)) {
    return c.json({ message: 'E-mail ou senha inválidos.' }, 401);
  }

  return c.json({ id: usuario.id, nome: usuario.nome, email: usuario.email });
});