/**
 * analisarPix v2 — Los Hombres
 * Regras de validação:
 *   1. Destinatário DEVE conter "JG Espaço Multserviços" OU "Jonathan Guimarães" (variações aceitas)
 *   2. Status DEVE ser "Efetuado" / "Concluído" / "Aprovado" — REPROVA se for "Agendado" / "Pendente" / "Em processamento"
 *   3. Deve ser imagem real de comprovante PIX (não selfie, cardápio, etc.)
 */

const OPENAI_KEY  = Deno.env.get('OPENAI_API_KEY') || '';
const BOT_TOKEN   = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN') || '';
const GRUPO_ID    = '-1003866193031'; // Gestão JG
const SHEET_ID    = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const ABAS: Record<number,string> = {1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};

async function alertarData(nome: string, horarioAgend: string, dataComprov: string | null) {
  if (!BOT_TOKEN || !dataComprov) return;
  const msg = [
    '⚠️ *ALERTA — DATA DO COMPROVANTE PIX*',
    '',
    `👤 Cliente: ${nome || 'desconhecido'}`,
    `📅 Agendamento: ${horarioAgend}`,
    `🧾 Data no comprovante: ${dataComprov}`,
    '',
    '❓ A data do comprovante não corresponde ao dia do agendamento.',
    'Por favor, verifique manualmente se o pagamento é legítimo.',
  ].join('\n');
  await fetch(\`https://api.telegram.org/bot\${BOT_TOKEN}/sendMessage\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: GRUPO_ID, text: msg, parse_mode: 'Markdown' }),
  }).catch(() => {});
}

// Nomes aceitos como destinatário (variações com/sem acento)
const DESTINATARIOS_VALIDOS = [
  'jg espaço multserviços',
  'jg espaco multservicos',
  'jg espaço multi',
  'jg espaco multi',
  'jonathan guimaraes',
  'jonathan guimarães',
  'j guimaraes',
  'j guimarães',
  'jg espaco',
  'jg espaço',
  'multserviços',
  'multservicos',
];

// Status que REPROVAM (PIX agendado = não compensado ainda)
const STATUS_INVALIDOS = [
  'agendado',
  'pendente',
  'em processamento',
  'aguardando',
  'em análise',
  'em analise',
  'scheduled',
  'pending',
];

function normStr(s: string): string {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function normHora(h: string): string {
  if (!h) return '';
  const m = h.match(/(\d{1,2})[hH:]?(\d{0,2})/);
  if (m) { const hh = m[1].padStart(2,'0'), mm = (m[2]||'00').padStart(2,'0'); if (Number(hh)<=23) return `${hh}:${mm}`; }
  return '';
}

async function analisarImagemPix(imageUrl: string): Promise<{
  valido: boolean;
  valor: string | null;
  beneficiario: string | null;
  status_transacao: string | null;
  data: string | null;
  motivo: string;
  motivo_rejeicao_detalhe?: string;
}> {
  if (!OPENAI_KEY) return { valido: true, valor: null, beneficiario: null, status_transacao: null, data: null, motivo: 'OpenAI não configurado — aprovado manualmente' };

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Você é um validador de comprovantes PIX para o Estúdio Los Hombres.

Analise a imagem e responda SOMENTE com JSON neste formato exato:
{
  "eh_comprovante_pix": true/false,
  "beneficiario": "nome exato do destinatário/beneficiário que aparece na imagem, ou null",
  "valor": "valor exato como aparece na imagem, ex: R$ 30,00, ou null",
  "status_transacao": "status exato como aparece, ex: Efetuado, Agendado, Pendente, Concluído, ou null",
  "data": "data da transação ou null",
  "motivo": "explicação curta do resultado"
}

REGRAS OBRIGATÓRIAS (aplique na ordem):
1. Se NÃO for imagem de comprovante PIX (selfie, cardápio, conversa, foto qualquer): eh_comprovante_pix=false, motivo deve explicar o que é a imagem.
2. Se for comprovante mas o status for "Agendado", "Pendente", "Em processamento" ou similar (PIX ainda não compensado): beneficiario e valor podem ser preenchidos, mas inclua o status real no campo status_transacao.
3. Se for comprovante efetuado mas o beneficiário NÃO contiver "JG" ou "Jonathan" ou "Multserviços" ou "Multservicos": inclua o nome exato que aparece no campo beneficiario.
4. Se tudo estiver correto (comprovante real + efetuado + beneficiário correto): preencha todos os campos com os dados reais.

Seja preciso ao ler os textos na imagem. Não invente dados.`
            },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
          ]
        }]
      })
    });

    const d = await r.json();
    const content = d.choices?.[0]?.message?.content || '{}';
    const clean = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const ehComprovante  = parsed.eh_comprovante_pix === true;
    const benefRaw       = (parsed.beneficiario || '').trim();
    const statusRaw      = (parsed.status_transacao || '').trim();
    const benefNorm      = normStr(benefRaw);
    const statusNorm     = normStr(statusRaw);

    // ── Regra 1: não é comprovante ────────────────────────────────────────
    if (!ehComprovante) {
      return {
        valido: false,
        valor: null,
        beneficiario: null,
        status_transacao: null,
        data: null,
        motivo: parsed.motivo || 'A imagem não é um comprovante PIX.',
        motivo_rejeicao_detalhe: 'NOT_PIX',
      };
    }

    // ── Regra 2: PIX agendado / pendente ─────────────────────────────────
    const isAgendado = STATUS_INVALIDOS.some(s => statusNorm.includes(s));
    if (isAgendado) {
      return {
        valido: false,
        valor: parsed.valor,
        beneficiario: benefRaw,
        status_transacao: statusRaw,
        data: parsed.data,
        motivo: `⚠️ Este PIX está com status "${statusRaw}" — ainda não foi compensado. Só é aceito comprovante com status Efetuado ou Concluído.`,
        motivo_rejeicao_detalhe: 'PIX_AGENDADO',
      };
    }

    // ── Regra 3: destinatário errado ──────────────────────────────────────
    const destOk = DESTINATARIOS_VALIDOS.some(d => benefNorm.includes(d));
    if (!destOk) {
      const nomeMostrado = benefRaw || '(não identificado)';
      return {
        valido: false,
        valor: parsed.valor,
        beneficiario: benefRaw,
        status_transacao: statusRaw,
        data: parsed.data,
        motivo: `❌ Destinatário "${nomeMostrado}" não corresponde ao estúdio. O PIX deve ser para JG Espaço Multserviços ou Jonathan Guimarães.`,
        motivo_rejeicao_detalhe: 'DEST_ERRADO',
      };
    }

    // ── Aprovado ──────────────────────────────────────────────────────────
    return {
      valido: true,
      valor: parsed.valor,
      beneficiario: benefRaw,
      status_transacao: statusRaw,
      data: parsed.data,
      motivo: `✅ Comprovante válido — ${statusRaw}${parsed.valor ? ' · ' + parsed.valor : ''}`,
    };

  } catch (e: any) {
    return { valido: false, valor: null, beneficiario: null, status_transacao: null, data: null, motivo: `Erro na análise: ${e.message}` };
  }
}

async function salvarNaPlanilha(sheetsToken: string, dia: number, mes: number, hora: string, imageUrl: string, analise: { valor: string|null; beneficiario: string|null; data: string|null; status_transacao: string|null }): Promise<{ ok: boolean; linha?: number; erro?: string }> {
  const aba = ABAS[mes] || 'MAI';
  const horaAlvo = normHora(hora);
  const lRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${aba}!A1:I500`, { headers: { Authorization: `Bearer ${sheetsToken}` } });
  if (!lRes.ok) return { ok: false, erro: 'Erro ao ler planilha' };
  const rows: string[][] = (await lRes.json()).values || [];
  let linhaAlvo = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = [...rows[i]]; while (r.length < 9) r.push('');
    const colA = (r[0] || '').trim();
    if (colA !== String(dia) && colA !== String(dia).padStart(2,'0')) continue;
    const hNorm = normHora(r[6] || '');
    if (horaAlvo && hNorm && hNorm === horaAlvo) { linhaAlvo = i + 1; break; }
    if (!horaAlvo && r[1].trim()) { linhaAlvo = i + 1; break; }
  }
  if (linhaAlvo < 0) return { ok: false, erro: `Linha não encontrada para dia ${dia} às ${hora || '(qualquer)'}` };

  const obsAtual = rows[linhaAlvo - 1]?.[4] || '';
  const pixInfo = `✅ SINAL R$30 PIX EFETUADO${analise.valor ? ' — ' + analise.valor : ''}${analise.data ? ' (' + analise.data + ')' : ''}${analise.beneficiario ? ' — Benef: ' + analise.beneficiario : ''}${analise.status_transacao ? ' — Status: ' + analise.status_transacao : ''}`;
  const novaObs = obsAtual ? `${obsAtual} | ${pixInfo}` : pixInfo;

  const range = `${aba}!E${linhaAlvo}`;
  const putRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, values: [[novaObs]] })
  });
  if (!putRes.ok) return { ok: false, erro: `Erro ao gravar: ${(await putRes.text()).slice(0,100)}` };
  return { ok: true, linha: linhaAlvo };
}

Deno.serve(async (req: Request) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' };
  if (req.method === 'OPTIONS') return new Response('', { headers: cors });
  if (req.method === 'GET') return new Response(JSON.stringify({ ok: true, status: 'analisarPix v2 — validação destinatário + status' }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const body = await req.json();
    const { imageUrl, sheetsToken, dia, mes, hora } = body;
    if (!imageUrl) return new Response(JSON.stringify({ erro: 'imageUrl obrigatório' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

    const analise = await analisarImagemPix(imageUrl);

    // Verificar divergência de data — alertar no Telegram se comprovante muito distante
    if (analise.valido && analise.data) {
      const nomeCliente = body.nomeCliente || '';
      const diaStr = dia ? String(dia).padStart(2,'0') : '';
      const mesStr = mes ? String(mes).padStart(2,'0') : '';
      const horarioLabel = `${diaStr}/${mesStr} às ${hora || '?'}`;

      // Tentar extrair data do comprovante
      const dataComp = analise.data;
      const hoje = new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
      const hojeDia = hoje.getDate();
      const hojeStr = String(hojeDia).padStart(2,'0') + '/' + String(hoje.getMonth()+1).padStart(2,'0');

      // Se a data do comprovante não contiver o dia de hoje nem o dia do agendamento → alerta
      const dataCompNorm = dataComp.replace(/[^0-9\/\-]/g,' ').trim();
      const contemHoje = dataCompNorm.includes(hojeStr) || dataComp.includes(String(hojeDia));
      const contemDia  = diaStr ? (dataCompNorm.includes(diaStr + '/') || dataCompNorm.includes('/' + diaStr)) : true;
      if (!contemHoje && !contemDia) {
        // Datas muito divergentes — alertar Jonathan mas não bloquear
        await alertarData(nomeCliente, horarioLabel, dataComp);
      }
    }

    let planilha: { ok: boolean; linha?: number; erro?: string } = { ok: false, erro: 'sheetsToken não fornecido' };
    if (analise.valido && sheetsToken && dia && mes) {
      planilha = await salvarNaPlanilha(sheetsToken, parseInt(String(dia)), parseInt(String(mes)), hora || '', imageUrl, {
        valor: analise.valor,
        beneficiario: analise.beneficiario,
        data: analise.data,
        status_transacao: analise.status_transacao,
      });
    }

    return new Response(JSON.stringify({
      ok: analise.valido,
      valido: analise.valido,
      valor: analise.valor,
      beneficiario: analise.beneficiario,
      status_transacao: analise.status_transacao,
      data_transacao: analise.data,
      motivo: analise.motivo,
      motivo_rejeicao_detalhe: analise.motivo_rejeicao_detalhe,
      planilha,
      imageUrl,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ erro: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
