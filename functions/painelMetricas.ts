import { createClient } from 'npm:@base44/sdk@0.8.25';

const base44 = createClient({ appId: '6a04cc22bf7a0dcea87e3c43' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    const leads = await base44.asServiceRole.entities.LeadConversa.list();

    const total = leads.length;
    const convertidos = leads.filter((l: any) => l.converteu).length;
    const taxaConversao = total > 0 ? ((convertidos / total) * 100).toFixed(1) : '0';

    // Por canal
    const porCanal: Record<string, number> = {};
    for (const l of leads) {
      const c = l.canal_origem || 'outro';
      porCanal[c] = (porCanal[c] || 0) + 1;
    }

    // Por etapa do funil
    const porEtapa: Record<string, number> = {
      iniciou: 0, perguntou_massagem: 0, pediu_preco: 0,
      clicou_agenda: 0, pagou_sinal: 0, confirmado: 0, abandonou: 0
    };
    for (const l of leads) {
      const e = l.etapa_funil || 'iniciou';
      porEtapa[e] = (porEtapa[e] || 0) + 1;
    }

    // Massagens mais consultadas
    const porMassagem: Record<string, number> = {};
    for (const l of leads) {
      if (l.massagem_interesse) {
        porMassagem[l.massagem_interesse] = (porMassagem[l.massagem_interesse] || 0) + 1;
      }
    }
    const topMassagens = Object.entries(porMassagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Leads prontos para reengajamento (não converteram, não receberam ainda, últimos 30 dias)
    const agora = new Date();
    const prontoReengajamento = leads.filter((l: any) => {
      if (l.converteu || l.reengajamento_enviado || !l.whatsapp) return false;
      if (!l.data_ultimo_contato) return false;
      const diff = (agora.getTime() - new Date(l.data_ultimo_contato).getTime()) / (1000 * 60 * 60);
      return diff >= 24; // mais de 24h sem retorno
    });

    // Últimos 10 leads
    const ultimosLeads = [...leads]
      .sort((a: any, b: any) => new Date(b.data_ultimo_contato || b.created_date).getTime() - new Date(a.data_ultimo_contato || a.created_date).getTime())
      .slice(0, 10)
      .map((l: any) => ({
        nome: l.nome || 'Anônimo',
        whatsapp: l.whatsapp || '-',
        canal: l.canal_origem || '-',
        etapa: l.etapa_funil || '-',
        massagem: l.massagem_interesse || '-',
        converteu: l.converteu || false,
        data: l.data_ultimo_contato || l.created_date
      }));

    // Evolução diária últimos 14 dias
    const evolucao: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(agora);
      d.setDate(d.getDate() - i);
      evolucao[d.toISOString().slice(0, 10)] = 0;
    }
    for (const l of leads) {
      const dia = (l.data_ultimo_contato || l.created_date || '').slice(0, 10);
      if (evolucao[dia] !== undefined) evolucao[dia]++;
    }

    return new Response(JSON.stringify({
      ok: true,
      metricas: {
        total_leads: total,
        convertidos,
        taxa_conversao: taxaConversao,
        pendente_reengajamento: prontoReengajamento.length,
        por_canal: porCanal,
        por_etapa: porEtapa,
        top_massagens: topMassagens,
        evolucao_diaria: evolucao,
        ultimos_leads: ultimosLeads
      }
    }), { headers });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
  }
});
