import { Hono } from 'hono';
import { internacaoRepository } from '../repositories/internacao.repository.js';

export const analyticsRoutes = new Hono()
  .get('/', async (c) => {
    const internacoes = await internacaoRepository.listarParaAnalytics();

    const porStatus = [
      { name: 'Estável',    value: internacoes.filter((i) => i.status === 'estavel').length },
      { name: 'Observação', value: internacoes.filter((i) => i.status === 'observacao').length },
      { name: 'Crítico',    value: internacoes.filter((i) => i.status === 'critico').length },
    ];

    const especieMap = new Map<string, number>();
    for (const i of internacoes) {
      especieMap.set(i.especie, (especieMap.get(i.especie) ?? 0) + 1);
    }
    const porEspecie = Array.from(especieMap.entries()).map(([name, value]) => ({ name, value }));

    const hoje = new Date();
    const porDia = Array.from({ length: 7 }, (_, offset) => {
      const dia = new Date(hoje);
      dia.setDate(hoje.getDate() - (6 - offset));
      const label = dia.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
      const count = internacoes.filter((i) => {
        const d = new Date(i.entradaEm);
        return d.getDate() === dia.getDate()
          && d.getMonth() === dia.getMonth()
          && d.getFullYear() === dia.getFullYear();
      }).length;
      return { dia: label, internacoes: count };
    });

    return c.json({ total: internacoes.length, porStatus, porEspecie, porDia });
  });
