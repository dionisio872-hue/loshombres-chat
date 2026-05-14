/**
 * TELEGRAM WEBHOOK — Los Hombres Estúdio
 * Responde automaticamente com regras fixas (0 crédito de mensagem IA)
 * Registra cada interação em LeadConversa para relatórios ricos
 *
 * ANTI-DUPLICATE: cache de update_id para evitar processamento duplo
 * v11 - 2026-05-14: reuniao_online detection, tipos de agendamento mapeados
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || '';

// ─── DEDUPLICAÇÃO ─────────────────────────────────────────────────────────────
const processedIds = new Set<number>();
const MAX_CACHE = 500;

function jaProcessado(updateId: number): boolean {
  if (processedIds.has(updateId)) return true;
  processedIds.add(updateId);
  if (processedIds.size > MAX_CACHE) {
    const iter = processedIds.values();
    processedIds.delete(iter.next().value);
  }
  return false;
}

// ─── DADOS FIXOS ──────────────────────────────────────────────────────────────

const AUDIOS: Record<string, string> = {
  'relaxante': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3dd77b15c_relaxante_sensual.mp3',
  'tantrica': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/5ebaa1cb7_tantra_experience.mp3',
  'quick': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/9b0bfdb87_quick.mp3',
  'miofascial': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/c605ad306_miofascial.mp3',
  'nuru': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/fa37daf7b_nuru.mp3',
  'mutua': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/9e4019729_tantra_mutua.mp3',
  'blind': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3d7e0aa91_blind.mp3',
  'deuses': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/c67565fce_deuses.mp3',
  'hot': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/2cf6b9baf_7d3111fba_Hotmassagem.ogg',
  'bdsm': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d229e48c4_tie_teaser.mp3',
  'hidro': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/6160220ba_hidrotantra.mp3',
  'burn': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/8970682cf_burn.mp3',
  'summa': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/13d3b5d71_summa_experientia.mp3',
  '4maos': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/d6b331670_4maos.mp3',
  'podo': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/44675462b_podoloterapia.mp3',
  'tantra_casal': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/3dc790b06_tantra_casal.mp3',
  'relaxante_casal': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/6c22f5ac1_relaxante_sensual_casal.mp3',
  'nuru_casal': 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/787e65832_nuru_casal.mp3',
};

const MASSAGENS: Array<{chaves: string[], nome: string, audio: string, texto: string, preco?: string, preco_desc?: string}> = [
  { chaves: ['relaxante sensual', 'relaxante', 'sensual'], nome: 'Relaxante Sensual', audio: AUDIOS.relaxante, preco: 'R$ 280', preco_desc: 'R$ 224 (com 20% de desconto para 30 dias de antecedência)', texto: 'Uma massagem que combina relaxamento profundo com toque sensorial envolvente. Indicada para quem busca descanso do corpo com presença e calor humano.' },
  { chaves: ['tantrica experience', 'tântrica experience', 'tantra experience', 'tantrica', 'tântrica', 'lingam'], nome: 'Tântrica Experience', audio: AUDIOS.tantrica, preco: 'R$ 350', preco_desc: 'R$ 280 (com 20% de desconto para 30 dias de antecedência)', texto: 'Uma vivência bioenergética e sensorial completa, com a prática do Lingam Massagem. Para quem quer ir além do físico e reconectar energia vital.' },
  { chaves: ['quick', 'rápida', 'rapida', '25 min', '25min'], nome: 'Quick Massage', audio: AUDIOS.quick, preco: 'R$ 180', preco_desc: 'R$ 144 (com 20% de desconto para 30 dias de antecedência)', texto: 'Sessão de 25 minutos com técnica oriental e deslizamento corporal. Prática, direta e eficiente para quem tem pouco tempo mas quer qualidade.' },
  { chaves: ['miofascial', 'esportiva', 'fascia'], nome: 'Miofascial', audio: AUDIOS.miofascial, preco: 'R$ 300', preco_desc: 'R$ 240 (com 20% de desconto para 30 dias de antecedência)', texto: 'Liberação miofascial combinada com massagem esportiva. Realizada em roupas íntimas, com foco na soltura profunda dos tecidos e alívio de tensões acumuladas.' },
  { chaves: ['nuru summa', 'nuru', 'corpo a corpo'], nome: 'Nuru Summa', audio: AUDIOS.nuru, preco: 'R$ 450', preco_desc: 'R$ 360 (com 20% de desconto para 30 dias de antecedência)', texto: 'Deslizamento corpo a corpo com óleo especial, ambos sem roupa. Uma das experiências mais imersivas e sensoriais do estúdio.' },
  { chaves: ['mútua', 'mutua', 'tantrica mutua', 'tântrica mútua'], nome: 'Tântrica Mútua', audio: AUDIOS.mutua, preco: 'R$ 400', preco_desc: 'R$ 320 (com 20% de desconto para 30 dias de antecedência)', texto: 'Toque consciente e mútuo, ambos nus. Uma experiência guiada de troca sensorial e presença plena.' },
  { chaves: ['blind', 'às cegas', 'as cegas', 'venda', 'privação visual', 'privacao visual'], nome: 'Blind Experience', audio: AUDIOS.blind, preco: 'R$ 350', preco_desc: 'R$ 280 (com 20% de desconto para 30 dias de antecedência)', texto: 'Com os olhos cobertos, cada toque é amplificado. A privação visual transforma a percepção e intensifica todas as sensações.' },
  { chaves: ['deuses', 'vinho', 'petisco', 'massagem dos deuses'], nome: 'Massagem dos Deuses', audio: AUDIOS.deuses, preco: 'R$ 500', preco_desc: 'R$ 400 (com 20% de desconto para 30 dias de antecedência)', texto: 'Imersão sensorial completa com vinho e petiscos. Interação permitida. Uma experiência que vai além da massagem.' },
  { chaves: ['hot massage', 'hot'], nome: 'HOT', audio: AUDIOS.hot, preco: 'R$ 320', preco_desc: 'R$ 256 (com 20% de desconto para 30 dias de antecedência)', texto: 'Estímulos sensoriais localizados e concentrados. Intensidade com controle, para quem busca algo mais focalizado.' },
  { chaves: ['bdsm', 'tie and teaser', 'tie', 'teaser', 'dominação', 'dominacao'], nome: 'Tie and Teaser BDSM', audio: AUDIOS.bdsm, preco: 'R$ 450', preco_desc: 'R$ 360 (com 20% de desconto para 30 dias de antecedência)', texto: 'Experiência sensorial guiada por controle e provocação consciente. Exploração segura e respeitosa dos limites do prazer.' },
  { chaves: ['hidrotantra', 'hidro tantra', 'banheira', 'aquática', 'aquatica'], nome: 'Hidrotantra', audio: AUDIOS.hidro, preco: 'R$ 500', preco_desc: 'R$ 400 (com 20% de desconto para 30 dias de antecedência)', texto: 'Vivência aquática em banheira de hidromassagem combinada com toque tântrico. Relaxamento total do corpo e da mente.' },
  { chaves: ['burn', 'térmica', 'termica', 'fogo', 'quente'], nome: 'Burn', audio: AUDIOS.burn, preco: 'R$ 380', preco_desc: 'R$ 304 (com 20% de desconto para 30 dias de antecedência)', texto: 'Estímulos térmicos e sensoriais que criam contrastes únicos de sensação ao longo de toda a experiência.' },
  { chaves: ['summa experientia', 'summa', 'íntima', 'intima'], nome: 'Summa Experientia', audio: AUDIOS.summa, preco: 'R$ 1.350', preco_desc: 'R$ 1.350 (valor fixo)', texto: 'A experiência máxima do estúdio. A única sessão com interação íntima integrada. Protocolos de saúde rigorosos: PrEP + preservativo obrigatórios.' },
  { chaves: ['4 mãos', '4 maos', 'quatro mãos', 'quatro maos', 'dois terapeutas'], nome: 'Massagem 4 Mãos', audio: AUDIOS['4maos'], preco: 'R$ 500', preco_desc: 'R$ 400 (com 20% de desconto para 30 dias de antecedência)', texto: 'Dois terapeutas trabalhando em sincronia perfeita. Uma experiência de cobertura total e sensações simultâneas.' },
  { chaves: ['podoloterapia', 'podologia'], nome: 'Podoloterapia', audio: AUDIOS.podo, preco: 'R$ 200', preco_desc: 'R$ 160 (com 20% de desconto para 30 dias de antecedência)', texto: 'Tratamento especializado nos pés com técnicas de reflexologia e relaxamento. Muito mais do que uma massagem comum nos pés.' },
  { chaves: ['casal', 'namorado', 'parceiro'], nome: 'Massagens para Casais', audio: AUDIOS.tantra_casal, preco: 'a partir de R$ 500', preco_desc: 'Consulte os valores para cada modalidade', texto: 'Temos três opções para casais: Relaxante Sensual Casal, Tântrica Casal e Nuru Casal. Qual delas te interessa mais?' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function normalizar(texto: string): string {
  return texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function detectarMassagem(texto: string) {
  const n = normalizar(texto);
  for (const m of MASSAGENS) {
    for (const chave of m.chaves) {
      if (n.includes(normalizar(chave))) return m;
    }
  }
  return null;
}

function detectarIntencao(texto: string): string {
  const n = normalizar(texto);
  if (/^(oi|ola|bom dia|boa tarde|boa noite|hello|hey|tudo bem|tudo bom|oi tudo|ola tudo)$/.test(n.trim())) return 'saudacao_simples';
  if (/oi|ola|bom dia|boa tarde|boa noite|hello|hey|tudo bem|tudo bom/.test(n)) return 'saudacao';
  if (/preco|valor|quanto|custa|tabela|valores/.test(n)) return 'preco';
  if (/agendar|marcar|reservar|disponib|horario|agenda|quando/.test(n)) return 'agendar';
  if (/onde|endereco|endereço|localiz|savassi|betim|unidade/.test(n)) return 'localizacao';
  if (/sexo|transar|fazer sexo|programa|final feliz/.test(n)) return 'sexo';
  if (/pix|comprovante|sinal|paguei|transferi|pagamento/.test(n)) return 'pagamento';
  if (/obrigado|obrigada|valeu|muito bom|gostei|adorei/.test(n)) return 'agradecimento';
  if (/vaga|trabalhar|emprego|recrutamento|contratar|equipe/.test(n)) return 'vaga';
  if (/curso|formacao|formação|aprender|treinar/.test(n)) return 'curso';
  if (/micose|fungo|pele|ferida/.test(n)) return 'micose';
  if (/vergonha|timido|corpo/.test(n)) return 'vergonha';
  if (/inseguro/.test(n)) return 'reuniao_online';
  if (/tatuagem|tattoo/.test(n)) return 'tatuagem';
  if (/nao sei|nao tenho certeza|medo|receio|nervoso|ansioso|constrangido|envergonhado|muita duvida|muitas duvidas|videochamada|video chamada|reuniao|conhecer antes|bater um papo|falar antes|conversar antes/.test(n)) return 'reuniao_online';
  if (/massagem|servico|serviço|opcoes|opções|tipos/.test(n)) return 'listar';
  return 'outro';
}

// ─── NÍVEL DE INTERAÇÃO ───────────────────────────────────────────────────────
// Classifica o nível de engajamento baseado na intenção detectada
function calcularNivelInteracao(intencao: string, massagem: string | null): string {
  if (intencao === 'saudacao_simples') return 'so_oi';
  if (massagem) return 'perguntou_servico';
  if (['preco', 'agendar', 'pagamento'].includes(intencao)) return 'alto_interesse';
  if (['sexo', 'listar'].includes(intencao)) return 'perguntou_servico';
  if (['localizacao'].includes(intencao)) return 'alto_interesse';
  if (['vaga', 'curso'].includes(intencao)) return 'perguntou_conteudo';
  if (['saudacao'].includes(intencao)) return 'interagiu';
  if (['agradecimento'].includes(intencao)) return 'interagiu';
  return 'interagiu';
}

// ─── ETAPA DO FUNIL ───────────────────────────────────────────────────────────
function calcularEtapaFunil(intencao: string, massagem: string | null): string {
  if (intencao === 'pagamento') return 'pagou_sinal';
  if (intencao === 'agendar') return 'acessou_agenda';
  if (massagem || intencao === 'preco') return 'pediu_preco';
  if (intencao === 'listar' || intencao === 'sexo') return 'consulta_massagem';
  return 'entrada';
}

// ─── REGISTRO DE LEAD ─────────────────────────────────────────────────────────
async function registrarLead(req: Request, chatId: number, nome: string, mensagem: string, intencao: string, massagemNome: string | null) {
  try {
    const base44 = createClientFromRequest(req);
    const telegramId = String(chatId);
    const nivelInteracao = calcularNivelInteracao(intencao, massagemNome);
    const etapaFunil = calcularEtapaFunil(intencao, massagemNome);
    const agora = new Date().toISOString();

    // Buscar lead existente
    const todos = await base44.asServiceRole.entities.LeadConversa.list();
    const existente = todos.find((l: any) => l.telegram_chat_id === telegramId);

    if (existente) {
      // Atualizar lead existente — avançar etapa se for mais avançada
      const ordemEtapas = ['entrada', 'consulta_massagem', 'pediu_preco', 'acessou_agenda', 'pagou_sinal', 'confirmado'];
      const etapaAtual = ordemEtapas.indexOf(existente.etapa_funil || 'entrada');
      const novaEtapa = ordemEtapas.indexOf(etapaFunil);

      // Atualizar observações acumulando interações
      const obsAtual = existente.observacoes || '';
      const novaObs = obsAtual + `\n[${agora}] ${intencao}${massagemNome ? ' | ' + massagemNome : ''}: ${mensagem.substring(0, 80)}`;

      await base44.asServiceRole.entities.LeadConversa.update(existente.id, {
        ultima_mensagem: mensagem.substring(0, 200),
        data_ultimo_contato: agora,
        etapa_funil: novaEtapa > etapaAtual ? etapaFunil : existente.etapa_funil,
        nivel_interacao: nivelInteracao,
        massagem_interesse: massagemNome || existente.massagem_interesse,
        observacoes: novaObs.substring(0, 2000),
        converteu: intencao === 'pagamento' ? true : existente.converteu,
      });
    } else {
      // Criar novo lead
      await base44.asServiceRole.entities.LeadConversa.create({
        nome: nome || `Telegram ${chatId}`,
        telegram_chat_id: telegramId,
        canal_origem: 'telegram',
        ultima_mensagem: mensagem.substring(0, 200),
        data_ultimo_contato: agora,
        etapa_funil: etapaFunil,
        nivel_interacao: nivelInteracao,
        massagem_interesse: massagemNome || null,
        reengajamento_enviado: false,
        converteu: false,
        observacoes: `[${agora}] Primeiro contato | ${intencao}${massagemNome ? ' | ' + massagemNome : ''}`,
      });
    }
  } catch (e: any) {
    console.error('Erro ao registrar lead:', e.message);
  }
}

// ─── SEND HELPERS ─────────────────────────────────────────────────────────────

async function sendText(chatId: number, text: string, replyMarkup?: object) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function sendAudio(chatId: number, audioUrl: string) {
  await fetch(`${TELEGRAM_API}/sendAudio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, audio: audioUrl }),
  });
}

// ─── RESPOSTAS ────────────────────────────────────────────────────────────────

async function responderSaudacao(chatId: number) {
  const audioUrl = 'https://base44.app/api/apps/6a04cc22bf7a0dcea87e3c43/files/mp/public/6a04cc22bf7a0dcea87e3c43/0ed5eedbe_apresentacao.ogg';
  await sendAudio(chatId, audioUrl);
  await sendText(chatId,
    `Sou massagista e meu foco é total no atendimento masculino, com espaços prontos pra te receber tanto em Betim quanto na Savassi.\n\nSei que a rotina é pesada e a gente quase não tem tempo de parar de verdade. Meu objetivo aqui é ser o seu momento de descanso. Pode ficar tranquilo: trabalho com sigilo absoluto. O ambiente é pra você relaxar de verdade, sem medo e sem julgamentos.\n\nMas me conta, o que te trouxe aqui hoje? Já teve alguma experiência de massagem focada em relaxamento total ou é a primeira vez que busca esse respiro?`,
    {
      inline_keyboard: [
        [{ text: '💆 Ver massagens', callback_data: 'listar' }, { text: '💰 Valores', callback_data: 'preco' }],
        [{ text: '📅 Agendar', callback_data: 'agendar' }, { text: '📍 Localização', callback_data: 'localizacao' }],
      ]
    }
  );
}

async function responderListar(chatId: number) {
  await sendText(chatId,
    `Trabalho com várias técnicas de massagem, adaptadas ao que cada pessoa busca no momento.\n\nVocê pode conferir todas as opções e detalhes direto no site: 👉 https://www.loshombres.com.br/\n\nSe preferir, me diz: você procura uma massagem <b>relaxante</b>, <b>sensual</b> ou <b>erótica</b>? A partir disso, te explico melhor como funciona e os valores 😊`
  );
}

async function responderMassagem(chatId: number, m: typeof MASSAGENS[0]) {
  await sendAudio(chatId, m.audio);
  let msg = `<b>${m.nome}</b>\n\n${m.texto}`;
  if (m.preco) msg += `\n\n💰 Valor: <b>${m.preco}</b>\n🎁 ${m.preco_desc}`;
  msg += `\n\n📅 Para agendar, o sinal é R$ 30,00 via PIX (CNPJ 17342740000109 — JG Espaço Multserviços).\n\nQual unidade prefere? Savassi ou Betim?`;
  await sendText(chatId, msg, {
    inline_keyboard: [
      [{ text: '📅 Savassi', callback_data: 'agendar_savassi' }, { text: '📅 Betim', callback_data: 'agendar_betim' }],
      [{ text: '💰 Ver todos os preços', callback_data: 'preco' }],
    ]
  });
}

async function responderPreco(chatId: number) {
  await sendText(chatId,
    `Os valores variam conforme a modalidade. Confira a tabela completa aqui:\n\n👉 https://www.loshombres.com.br/tabela.html\n\n🎁 <b>20% de desconto</b> para agendamentos com 30 dias de antecedência.\n\nQual massagem te interessa? Me diz e eu te passo o valor certinho 😊`
  );
}

async function responderAgendar(chatId: number) {
  await sendText(chatId,
    `Para garantir seu horário, escolha a unidade:\n\n📍 <b>Savassi</b> — Rua Tomé de Souza, 503, Sala 208\n👉 https://calendar.app.google/jBk4U8zf5WGb73MH6\n\n📍 <b>Betim</b> — Rua Pernambuco, 341 - N. S. das Graças\n👉 https://calendar.app.google/dandDDiGYKtD36Q19\n\nApós escolher o horário, o sinal é <b>R$ 30,00</b> via PIX:\nCNPJ: <b>17342740000109</b> (JG Espaço Multserviços)\n\nEnvie o comprovante aqui para confirmar sua reserva! 🙏`,
    {
      inline_keyboard: [
        [{ text: '📅 Agenda Savassi', url: 'https://calendar.app.google/jBk4U8zf5WGb73MH6' }],
        [{ text: '📅 Agenda Betim', url: 'https://calendar.app.google/dandDDiGYKtD36Q19' }],
      ]
    }
  );
}

async function responderLocalizacao(chatId: number) {
  await sendText(chatId,
    `Temos duas unidades:\n\n📍 <b>Savassi (BH)</b>\nRua Tomé de Souza, 503, Sala 208\n🗺️ https://maps.app.goo.gl/nuxgQUjwLL44f4Nt6\n\n📍 <b>Betim</b>\nRua Pernambuco, 341 - Bairro N. S. das Graças\n🗺️ https://maps.app.goo.gl/xoQe7PXwRR2JCe6m9\n\nQual fica mais perto de você? 😊`
  );
}

async function responderSexo(chatId: number) {
  await sendText(chatId,
    `Entendo sua pergunta e é super válida.\n\nA massagem sensual e erótica, apesar de ter bastante contato corporal e nudez, não inclui relação sexual. Ela é sensorial e muito envolvente, mas ainda assim segue uma proposta terapêutica e profissional.\n\nExiste uma modalidade específica chamada <b>Summa Experientia</b> — a única que inclui interação íntima sexual integrada à massagem (quando há clima e sintonia). Valor: <b>R$ 1.350,00</b>. Com protocolos de saúde: PrEP + preservativo.\n\nNas demais massagens, o atendimento segue o formato sensorial profissional.`
  );
}

async function responderPagamento(chatId: number) {
  await sendText(chatId,
    `Recebi! Assim que confirmar o pagamento do sinal (R$ 30,00), seu horário estará garantido.\n\nPIX CNPJ: <b>17342740000109</b> (JG Espaço Multserviços)\n\nEnvie o comprovante aqui e eu confirmo na hora 🙏\n\n⚠️ Lembre-se: cancelamentos com menos de 12h de antecedência retêm o sinal.`
  );
}

async function responderAgradecimento(chatId: number) {
  await sendText(chatId,
    `Fico feliz em poder ajudar! 😊\n\nSe precisar de mais alguma coisa, é só chamar. Estarei aqui!\n\n🌟 Aproveite sua sessão e cuide-se bem.`
  );
}

async function responderVaga(chatId: number) {
  await sendText(chatId,
    `Que bom seu interesse em fazer parte do time! O Estúdio Los Hombres é especializado em atendimento masculino de alto padrão.\n\n💰 Comissão: 30% (espaço próprio) ou 40% (usando nossa estrutura).\n\n📝 Preencha o formulário:\nhttps://docs.google.com/forms/d/e/1FAIpQLSf2a8ePAZy44mArO-zijJPt23RQHyB4a1G5FILIffz8XJQqjQ/viewform\n\nApós preencher, chame no WhatsApp (31) 98787-0330 para agendar a demonstração prática.`
  );
}

async function responderCurso(chatId: number) {
  await sendText(chatId,
    `Trabalho com 3 formações:\n\n🔹 <b>Automassagem</b> — R$ 500\n🔹 <b>Massagem Relaxamento e Conexão</b> — R$ 500\n🔹 <b>Nuru Summa</b> — R$ 1.200–1.300\n🎁 3 juntos com 10% desconto: <b>R$ 2.070</b>\n🔹 <b>Workshop Intensivo Individual (2 dias)</b> — R$ 2.000\n\nMais info: https://www.loshombres.com.br/#courses`
  );
}

async function responderMicose(chatId: number) {
  await sendText(chatId,
    `Por questão de segurança, não é indicado realizar massagem em regiões com micose ativa. Aguardar a completa cicatrização.\n\nQuando estiver tudo certo, será um prazer te atender! 😊`
  );
}

async function responderVergonha(chatId: number) {
  await sendText(chatId,
    `Massagem não é sobre ter "corpo padrão". Atendo corpos reais, de todos os tipos — gordo, magro, sarado, tímido, inseguro.\n\nO ambiente é de acolhimento, sem julgamento nenhum. Pode vir tranquilo 😊`
  );
}

async function responderReuniaoOnline(chatId: number) {
  await sendText(chatId,
    `Entendo completamente. É totalmente normal ter dúvidas antes de uma experiência nova, ainda mais quando se trata de algo tão pessoal.\n\nQue tal a gente marcar uma conversa rápida de 15 minutos por vídeo? Sem compromisso nenhum. Só pra você me conhecer, tirar suas dúvidas e ver se tem sintonia. Muita gente que veio pela primeira vez começou exatamente assim.\n\nSe quiser, é só clicar aqui para escolher um horário: 👇\nhttps://calendar.app.google/QxYxunGta5ieqTtr9\n\nDepois da conversa, se quiser agendar a sessão, fico à disposição 😊`
  );
}

async function responderTatuagem(chatId: number) {
  await sendText(chatId,
    `Para tatuagem, entre em contato pelo WhatsApp: (31) 99126-6270 📲`
  );
}

async function responderComIA(chatId: number, mensagem: string) {
  if (!OPENAI_KEY) {
    await sendText(chatId, `Entendi sua mensagem! Para questões específicas, entre em contato pelo WhatsApp: https://wa.me/5531983244713 😊`);
    return;
  }
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          { role: 'system', content: 'Você é o assistente virtual do Estúdio Los Hombres, especializado em massagens masculinas de alto padrão em BH. Responda de forma calorosa, sem julgamentos, em até 3 frases. Se não souber, direcione para o WhatsApp (31) 98324-4713.' },
          { role: 'user', content: mensagem }
        ]
      })
    });
    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || 'Para mais informações, entre em contato pelo WhatsApp: https://wa.me/5531983244713';
    await sendText(chatId, reply);
  } catch {
    await sendText(chatId, `Para mais informações, entre em contato pelo WhatsApp: https://wa.me/5531983244713 😊`);
  }
}

// ─── PROCESSAMENTO PRINCIPAL ──────────────────────────────────────────────────

async function processarMensagem(req: Request, chatId: number, texto: string, nomeUsuario: string) {
  const massagem = detectarMassagem(texto);
  const intencao = massagem ? 'massagem' : detectarIntencao(texto);
  const massagemNome = massagem?.nome || null;

  // Registrar lead de forma assíncrona (não bloqueia a resposta)
  registrarLead(req, chatId, nomeUsuario, texto, intencao, massagemNome);

  if (massagem) {
    await responderMassagem(chatId, massagem);
    return;
  }

  switch (intencao) {
    case 'saudacao_simples':
    case 'saudacao': await responderSaudacao(chatId); break;
    case 'listar': await responderListar(chatId); break;
    case 'preco': await responderPreco(chatId); break;
    case 'agendar': await responderAgendar(chatId); break;
    case 'localizacao': await responderLocalizacao(chatId); break;
    case 'sexo': await responderSexo(chatId); break;
    case 'pagamento': await responderPagamento(chatId); break;
    case 'agradecimento': await responderAgradecimento(chatId); break;
    case 'vaga': await responderVaga(chatId); break;
    case 'curso': await responderCurso(chatId); break;
    case 'micose': await responderMicose(chatId); break;
    case 'vergonha': await responderVergonha(chatId); break;
    case 'reuniao_online': await responderReuniaoOnline(chatId); break;
    case 'tatuagem': await responderTatuagem(chatId); break;
    default: await responderComIA(chatId, texto);
  }
}

async function processarCallback(req: Request, chatId: number, data: string, nomeUsuario: string) {
  registrarLead(req, chatId, nomeUsuario, `[botão: ${data}]`, data, null);
  switch (data) {
    case 'listar': await responderListar(chatId); break;
    case 'agendar':
    case 'agendar_savassi':
    case 'agendar_betim': await responderAgendar(chatId); break;
    case 'preco': await responderPreco(chatId); break;
    case 'localizacao': await responderLocalizacao(chatId); break;
    default: await responderSaudacao(chatId);
  }
}

// ─── WEBHOOK HANDLER ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: true, status: 'Bot Los Hombres ativo', canal: 'telegram' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response('ok', { status: 200 });
  }

  // Retornar 200 imediatamente para evitar retentativas do Telegram
  const responsePromise = new Response('ok', { status: 200 });

  (async () => {
    try {
      const updateId: number = update.update_id;

      if (jaProcessado(updateId)) {
        console.log(`[SKIP] update_id ${updateId} duplicado — ignorado`);
        return;
      }

      console.log(`[OK] update_id ${updateId}:`, JSON.stringify(update).slice(0, 200));

      if (update.message?.text) {
        const chatId = update.message.chat.id;
        const texto = update.message.text;
        const nome = [update.message.from?.first_name, update.message.from?.last_name].filter(Boolean).join(' ') || `User${chatId}`;
        await processarMensagem(req, chatId, texto, nome);
      }

      if (update.callback_query) {
        const chatId = update.callback_query.message.chat.id;
        const data = update.callback_query.data;
        const nome = [update.callback_query.from?.first_name, update.callback_query.from?.last_name].filter(Boolean).join(' ') || `User${chatId}`;
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: update.callback_query.id }),
        });
        await processarCallback(req, chatId, data, nome);
      }

    } catch (e: any) {
      console.error('Erro webhook:', e.message);
    }
  })();

  return responsePromise;
});
