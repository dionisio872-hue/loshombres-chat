/**
 * CRON MARCAR ABANDONADOS — Los Hombres
 * Roda a cada 2h via cron-job.org
 * Marca leads no Telegram que ficaram sem resposta há mais de 2h como etapa 'abandonou'
 * SEM IA — 100% backend function
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'loshombres2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('x-cron-secret');
  if (secret !== CRON_SECRET) return new Response('Unauthorized', { status: 401 });

  try {
    const base44 = createClientFromRequest(req);
    const agora = new Date();
    const limite = new Date(agora.getTime() - 2 * 3600 * 1000).toISOString();

    // Buscar leads ativos que não converteram e ficaram mudos há mais de 2h
    const leads = await base44.asServiceRole.entities.LeadConversa.list();
    const atualizar = leads.filter((l: any) =>
      l.etapa_funil &&
      l.etapa_funil !== 'confirmado' &&
      l.etapa_funil !== 'abandonou' &&
      !l.converteu &&
      l.data_ultimo_contato &&
      l.data_ultimo_contato < limite
    );

    let atualizados = 0;
    for (const l of atualizar) {
      await base44.asServiceRole.entities.LeadConversa.update(l.id, { etapa_funil: 'abandonou' });
      atualizados++;
    }

    // Também atualizar ConversaCliente antiga (compatibilidade)
    const conversas = await base44.asServiceRole.entities.ConversaCliente.list();
    const conversar = conversas.filter((c: any) =>
      c.status === 'em_conversa' &&
      c.data_ultima_mensagem &&
      c.data_ultima_mensagem < limite
    );
    for (const c of conversar) {
      await base44.asServiceRole.entities.ConversaCliente.update(c.id, { status: 'nao_fechou' });
      atualizados++;
    }

    console.log(`Marcados como abandonados: ${atualizados}`);
    return new Response(JSON.stringify({ ok: true, atualizados }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('cronAbandonados error:', e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
