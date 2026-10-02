import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { internacoesRoutes } from './routes/internacoes.js';
import { analyticsRoutes } from './routes/analytics.js';
import { authRoutes } from './routes/auth.js';
import { tutoresRoutes } from './routes/tutores.js';
import { leitosRoutes } from './routes/leitos.js';
import { petsRoutes } from './routes/pets.js';
import { financeiroRoutes } from './routes/financeiro.js';
import { usuariosRoutes } from './routes/usuarios.js';
import { racasRoutes } from './routes/racas.js';
import { parametrizacaoRoutes } from './routes/parametrizacao.js';
import { catalogoRoutes } from './routes/catalogo.js';

export const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: ['http://localhost:3000', 'http://web:3000'] }));

app.get('/api/health', (c) => c.json({ ok: true }));

app.route('/api/auth', authRoutes);
app.route('/api/usuarios', usuariosRoutes);
app.route('/api/racas', racasRoutes);
app.route('/api/leitos', leitosRoutes);
app.route('/api/pets', petsRoutes);
app.route('/api/tutores', tutoresRoutes);
app.route('/api/internacoes', internacoesRoutes);
app.route('/api/financeiro', financeiroRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/parametrizacao', parametrizacaoRoutes);
app.route('/api/catalogo', catalogoRoutes);

