/**
 * TELEGRAM WEBHOOK — Los Hombres Estúdio
 * Responde automaticamente com regras fixas (0 crédito de mensagem IA)
 * Registra cada interação em LeadConversa para relatórios ricos
 *
 * ANTI-DUPLICATE: cache de update_id para evitar processamento duplo
 * v11 - 2026-05-14: reuniao_online detection, tipos de agendamento mapeados
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BOT_TOKEN = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN') || Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
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

// ─── VÍDEOS POR MASSAGEM ──────────────────────────────────────────────────────
const VIDEOS: Record<string, string> = {
  'relaxante sensual': 'https://drive.google.com/file/d/11-2dPRI-12wXk-YG0kEoaQzHDMCDKXLn/view',
  'tantrica experience': 'https://drive.google.com/file/d/1iX0TQyZtnH5Te1oKJDQRkM2ah1Id9gsT/view',
  'quick massage': 'https://drive.google.com/file/d/19UFSp-pYb-_GeZfBoGVnmhVjxdm_ifqi/view',
  'miofascial': 'https://drive.google.com/file/d/1WsXJH2FHG9qW2Cvh9DXBxAkQicwnOJhj/view',
  'nuru summa': 'https://drive.google.com/file/d/12drdn_6WstMhAuDfkxgdz7mryfNnapBB/view',
  'tantrica mutua': 'https://drive.google.com/file/d/1kPCvgZpc6HZUZjlZLlsB_1cydVzfEPzl/view',
  'blind experience': 'https://drive.google.com/file/d/1e2zigQk2sKRZJzz-gpGfVzeVYO1-ha-H/view',
  'massagem dos deuses': 'https://drive.google.com/file/d/1ZmA8cPeoWq2r6EXxCiWGYSsj96S_cqlA/view',
  'hot': 'https://drive.google.com/file/d/1CXkvTG3UeANayJp2-taDU7dbnT1JEnmB/view',
  'tie and teaser': 'https://drive.google.com/file/d/1LsOQ__1GVRIkHhB0JaLX8moX34qHMzEa/view',
  'hidrotantra': 'https://drive.google.com/file/d/1rHJNPd4mVVieHvhFT9c8Zs58YbgdYGOo/view',
  'burn': 'https://drive.google.com/file/d/1yVnDrJNcJMUMX3cghb904Ph6AlD5axNp/view',
  'summa experientia': 'https://drive.google.com/file/d/1P6WR-AyHFsXOk9gcQvo6DDYGbNkDlMX0/view',
  'podoloterapia': 'https://drive.google.com/file/d/1tMZpDTEW0aTuQHTICdPJiJx3ZPhmQ14n/view',
  'tantrica casal': 'https://drive.google.com/file/d/1FnOivOdKreK4hZ-wFTLRgUxNBNarDKZV/view',
  'relaxante sensual casal': 'https://drive.google.com/file/d/1B1f-GeDCRQD8lEUiQccO59fhRb_71RiM/view',
  'nuru casal': 'https://drive.google.com/file/d/1rJ70vOebyKpQ_RhzGXzjQ-Dw1-xt4eLM/view',
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
  if (/^video\??$|^video\?\?$|quero ver|me manda o video|manda video|ver o video|tem video|mostra o video/.test(n.trim())) return 'pedir_video';
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
  // Buscar vídeo correspondente
  const nomeNorm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const massagemKey = Object.keys(VIDEOS).find(k => nomeNorm(m.nome).includes(nomeNorm(k)) || nomeNorm(k).includes(nomeNorm(m.nome)));
  const videoUrl = massagemKey ? VIDEOS[massagemKey] : null;
  let msg = `<b>${m.nome}</b>\n\n${m.texto}`;
  if (m.preco) msg += `\n\n💰 Valor: <b>${m.preco}</b>\n🎁 ${m.preco_desc}`;
  if (videoUrl) msg += `\n\n🎬 Vídeo: ${videoUrl}`;
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

async function responderPedirVideo(chatId: number) {
  await sendText(chatId,
    `Claro! Tenho vídeos explicativos de todas as massagens. 🎬\n\nQual massagem você quer ver?`,
    {
      inline_keyboard: [
        [{ text: 'Relaxante Sensual', callback_data: 'video_relaxante' }, { text: 'Tântrica Experience', callback_data: 'video_tantrica' }],
        [{ text: 'Nuru Summa', callback_data: 'video_nuru' }, { text: 'Tântrica Mútua', callback_data: 'video_mutua' }],
        [{ text: 'Blind Experience', callback_data: 'video_blind' }, { text: 'HOT', callback_data: 'video_hot' }],
        [{ text: 'Burn', callback_data: 'video_burn' }, { text: 'Summa Experientia', callback_data: 'video_summa' }],
        [{ text: 'Ver todas as massagens', callback_data: 'listar' }],
      ]
    }
  );
}

async function responderVideo(chatId: number, massagemKey: string) {
  const videoUrl = VIDEOS[massagemKey];
  if (videoUrl) {
    await sendText(chatId, `🎬 Aqui está o vídeo da <b>${massagemKey.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</b>:\n\n${videoUrl}\n\nQuer agendar essa sessão? 😊`, {
      inline_keyboard: [
        [{ text: '📅 Agendar', callback_data: 'agendar' }],
      ]
    });
  }
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
    case 'pedir_video': await responderPedirVideo(chatId); break;
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
    case 'agendar_savassi': await responderAgendarSavassi(chatId); break;
    case 'agendar_betim': await responderAgendarBetim(chatId); break;
    case 'preco': await responderPreco(chatId); break;
    case 'localizacao': await responderLocalizacao(chatId); break;
    case 'video_relaxante': await responderVideo(chatId, 'relaxante sensual'); break;
    case 'video_tantrica': await responderVideo(chatId, 'tantrica experience'); break;
    case 'video_nuru': await responderVideo(chatId, 'nuru summa'); break;
    case 'video_mutua': await responderVideo(chatId, 'tantrica mutua'); break;
    case 'video_blind': await responderVideo(chatId, 'blind experience'); break;
    case 'video_hot': await responderVideo(chatId, 'hot'); break;
    case 'video_burn': await responderVideo(chatId, 'burn'); break;
    case 'video_summa': await responderVideo(chatId, 'summa experientia'); break;
    case 'video_deuses': await responderVideo(chatId, 'massagem dos deuses'); break;
    case 'video_hidro': await responderVideo(chatId, 'hidrotantra'); break;
    case 'video_tie': await responderVideo(chatId, 'tie and teaser'); break;
    case 'video_podo': await responderVideo(chatId, 'podoloterapia'); break;
    case 'video_quick': await responderVideo(chatId, 'quick massage'); break;
    case 'video_miofascial': await responderVideo(chatId, 'miofascial'); break;
    default: await responderListar(chatId);
  }
}

// ─── WEBHOOK HANDLER ──────────────────────────────────────────────────────────


const ADMIN_ID = 7200577395;
const ADMIN_STR = '7200577395';
const GRUPO_JG_ID = '-1003866193031';  // Grupo Gestão JG
function isAdminContext(fromId:number, chatId:number|string):boolean {
  return fromId === ADMIN_ID || String(chatId) === GRUPO_JG_ID;
}
const SHEET_ID_BOT = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const ABAS_BOT: Record<number,string> = {1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};

function normHora(h:string):string{
  if(!h)return '';
  const m1=h.match(/^\s*(\d{1,2})[hH:](\d{0,2})/);
  if(m1){const hh=m1[1].padStart(2,'0');const mm=(m1[2]||'00').padStart(2,'0');if(!isNaN(Number(hh))&&Number(hh)<=23)return hh+':'+mm;}
  const m2=h.match(/(\d{1,2})[hH:](\d{0,2})/);
  if(m2){const hh=m2[1].padStart(2,'0');const mm=(m2[2]||'00').padStart(2,'0');if(!isNaN(Number(hh))&&Number(hh)<=23)return hh+':'+mm;}
  const m3=h.match(/\b(\d{1,2})[hH]\b/);
  if(m3&&!isNaN(Number(m3[1]))&&Number(m3[1])<=23)return m3[1].padStart(2,'0')+':00';
  return '';
}

// ─── DIVERGÊNCIAS — helpers ──────────────────────────────────────────────────
const SHEET_ID_DIV = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
const ABAS_DIV:Record<number,string>={1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};

// ─── PARSER DE TÍTULO DO CALENDAR ────────────────────────────────────────────
// Ex: "SM GRAVACAO - Mauricio"      → nome="Mauricio",    servico="Gravação"
// Ex: "Tântrica Experience - Pedro" → nome="Pedro",       servico="Tântrica"
// Ex: "DEBUTANTE NILCE 319..."      → nome="NILCE 319..", servico="Debutante"
function parsearTitulo(titulo:string):{nome:string;servico:string}{
  const TIPOS=[
    {p:/gravac|grav|recording/i,    l:'Gravação'},
    {p:/tattoo|tatuagem|tatu/i,       l:'Tatuagem'},
    {p:/ensaio|photosh|foto/i,        l:'Ensaio'},
    {p:/reuniao|meeting|online/i,     l:'Reunião'},
    {p:/relaxante\s*sensual/i,        l:'Relaxante Sensual'},
    {p:/tantrica|tantric|tântrica/i,  l:'Tântrica'},
    {p:/nuru/i,                       l:'Nuru Summa'},
    {p:/blind/i,                      l:'Blind Experience'},
    {p:/deuses/i,                     l:'Massagem dos Deuses'},
    {p:/summa/i,                      l:'Summa Experientia'},
    {p:/quick/i,                      l:'Quick Massage'},
    {p:/hidro/i,                      l:'Hidrotantra'},
    {p:/miofascial/i,                 l:'Miofascial'},
    {p:/burn/i,                   l:'Burn'},
    {p:/hot/i,                    l:'HOT'},
    {p:/bdsm|tie|teaser/i,            l:'Tie and Teaser'},
    {p:/podo/i,                       l:'Podoloterapia'},
    {p:/4\s*maos|quatro\s*maos/i,     l:'4 Mãos'},
    {p:/casal/i,                      l:'Casal'},
    {p:/debutante/i,                  l:'Debutante'},
    {p:/massagem/i,                   l:'Massagem'},
  ];
  const eServico=(s:string)=>TIPOS.some(t=>t.p.test(s));

  let servico='';
  for(const t of TIPOS){if(t.p.test(titulo)){servico=t.l;break;}}

  let nome=titulo.trim();
  // Remover bloco de MAIÚSCULAS inicial antes de " - " (ex: "SM GRAVACAO - ")
  nome=nome.replace(/^[A-ZÁÀÉÍÓÚ][A-ZÁÀÉÍÓÚ\s]{1,20}\s*-\s*/,'').trim();

  if(nome.includes(' - ')){
    const partes=nome.split(' - ').map((s:string)=>s.trim()).filter(Boolean);
    // Preferir a parte que NÃO é tipo de serviço (buscar de trás pra frente)
    const nomeParte=[...partes].reverse().find((p:string)=>!eServico(p));
    nome=nomeParte||partes[partes.length-1];
  } else if(servico){
    // Sem separador com serviço: remover palavras do serviço do texto
    for(const t of TIPOS) nome=nome.replace(t.p,'').trim();
    nome=nome.replace(/^[-\s]+|[-\s]+$/g,'').trim();
  }

  if(!nome||nome.length<2) nome='';
  return {nome,servico};
}


async function executarCorrecao(
  acao:string,tipo:string,diaN:number,mesN:number,hora:string,
  nome:string,tel:string,servico:string,obs:string,
  sheetsToken:string,calToken:string
):Promise<string>{

  // Normalizar acao baseado no tipo quando vier do "Corrigir Tudo"
  const acaoFinal = acao==='incluir'||tipo==='so_calendar' ? 'incluir' :
                    acao==='criar'||tipo==='so_planilha'   ? 'criar'   : acao;
  const tipoFinal = tipo==='so_calendar'||acao==='incluir' ? 'so_calendar' :
                    tipo==='so_planilha'||acao==='criar'   ? 'so_planilha' : tipo;

  if(acaoFinal==='incluir'){
    // ── INCLUIR NA PLANILHA (vinha só do Calendar) ──────────────────────
    if(!sheetsToken)return '❌ Token Sheets indisponível.';
    const aba=ABAS_DIV[mesN]||'MAI';
    const lRes=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_DIV}/values/${aba}!A1:I500`,
      {headers:{Authorization:`Bearer ${sheetsToken}`}});
    const rows:string[][]=(await lRes.json()).values||[];
    const [hh2,mm2]=hora.split(':').map(Number);
    const horaMins=hh2*60+mm2;
    let alvo=-1;
    for(let j=0;j<rows.length;j++){
      const r=[...rows[j]];while(r.length<9)r.push('');
      const colA=r[0].trim();
      if(colA!==String(diaN)&&colA!==String(diaN).padStart(2,'0'))continue;
      // REGRA: nunca sobrescrever linha já preenchida (coluna B com nome)
      if(r[1].trim()){
        const hNorm2=normHoraBot(r[6].trim());
        if(hNorm2){const [rh2,rm2]=hNorm2.split(':').map(Number);if(Math.abs((rh2*60+rm2)-horaMins)<=60)return `⚠️ Linha já preenchida (L${j+1}: ${r[1].trim()}) — não sobrescrita.`;}
        continue;
      }
      const hNorm=normHoraBot(r[6].trim());
      if(!hNorm)continue;
      const [rh,rm]=hNorm.split(':').map(Number);
      if(Math.abs((rh*60+rm)-horaMins)<=60){alvo=j+1;break;}
    }
    // Parsear título do Calendar → extrair nome do cliente e tipo de serviço
    const parsed=parsearTitulo(nome||'');
    const nomeGravar   = parsed.nome    || nome    || '(sem nome)';
    const servicoGravar= servico        || parsed.servico || '';
    const telGravar    = tel||'';
    const obsGravar    = obs||'Incluído via botão';

    if(alvo>0){
      // Linha vazia encontrada — preencher colunas B:E
      const range=`${aba}!B${alvo}:E${alvo}`;
      const putRes=await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_DIV}/values/${range}?valueInputOption=USER_ENTERED`,
        {method:'PUT',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
         body:JSON.stringify({range,values:[[nomeGravar,telGravar,servicoGravar,obsGravar]]})}
      );
      return putRes.ok
        ?`✅ Planilha L${alvo}: "${nomeGravar}" | ${servicoGravar||'-'}`
        :`❌ Erro planilha: ${(await putRes.text()).slice(0,80)}`;
    } else {
      // Linha vazia não encontrada — INSERIR nova linha com dia e hora
      // Encontrar última linha do dia para inserir após ela
      let ultimaLinhaDia=1;
      for(let j=0;j<rows.length;j++){
        const r=[...rows[j]];while(r.length<1)r.push('');
        const colA=r[0].trim();
        if(colA===String(diaN)||colA===String(diaN).padStart(2,'0')) ultimaLinhaDia=j+2;
      }
      // Append via batchUpdate para inserir linha
      const appendRange=`${aba}!A${ultimaLinhaDia}:H${ultimaLinhaDia}`;
      const appendRes=await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_DIV}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {method:'POST',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
         body:JSON.stringify({range:appendRange,values:[[String(diaN),nomeGravar,telGravar,servicoGravar,obsGravar,'','',hora,'']]})}
      );
      return appendRes.ok
        ?`✅ Nova linha inserida: dia ${diaN} ${hora}h — "${nomeGravar}" | ${servicoGravar||'-'}`
        :`❌ Erro inserir linha: ${(await appendRes.text()).slice(0,100)}`;
    }

  }else if(acaoFinal==='criar'){
    // ── CRIAR NO CALENDAR (vinha só da Planilha) ─────────────────────────
    // Verificar se já existe evento no Calendar para evitar duplicata
    if(!calToken)return '❌ Token Calendar indisponível.';
    const dStr2=`2026-${String(mesN).padStart(2,'0')}-${String(diaN).padStart(2,'0')}`;
    const checkRes=await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${dStr2}T00:00:00-03:00&timeMax=${dStr2}T23:59:59-03:00&singleEvents=true`,
      {headers:{Authorization:`Bearer ${calToken}`}});
    const existentes=(await checkRes.json()).items||[];
    const [hc,mc]=hora.split(':').map(Number);
    const hMin=hc*60+mc;
    const jaExiste=existentes.some((ev:any)=>{
      const dt=ev.start?.dateTime||'';
      if(!dt.includes('T'))return false;
      const [eh,em]=dt.slice(11,16).split(':').map(Number);
      return Math.abs((eh*60+em)-hMin)<=15;
    });
    if(jaExiste)return `⚠️ Evento já existe no Calendar para ${hora}h dia ${diaN} — não duplicado.`;

    const dStr=`2026-${String(mesN).padStart(2,'0')}-${String(diaN).padStart(2,'0')}`;
    const [hh2,mm2]=hora.split(':');
    const iniStr=`${dStr}T${hh2.padStart(2,'0')}:${(mm2||'00').padStart(2,'0')}:00-03:00`;
    const iniMs=new Date(iniStr).getTime();
    if(isNaN(iniMs))return `❌ Hora inválida: "${hora}"`;
    const fimStr=new Date(iniMs+90*60000).toISOString();
    const calR=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',{
      method:'POST',headers:{Authorization:`Bearer ${calToken}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        summary:nome,
        description:`Tel: ${tel||'-'} | ${servico||'-'} | ${obs||'Criado via botão de divergência'}`,
        start:{dateTime:iniStr,timeZone:'America/Sao_Paulo'},
        end:{dateTime:fimStr,timeZone:'America/Sao_Paulo'},
      })
    });
    const d=await calR.json();
    return d.id
      ?`✅ Calendar: ${nome} — ${hora}h dia ${diaN}`
      :`❌ Erro Calendar: ${JSON.stringify(d).slice(0,100)}`;

  }else if(acaoFinal==='ignorar'){
    return `↩ Ignorado: ${hora}h dia ${diaN}`;
  }else if(acaoFinal==='excluir'){
    return `↩ Excluir manualmente: ${hora}h dia ${diaN}`;
  }
  return `❓ Ação desconhecida: ${acao} / tipo: ${tipo}`;
}

// ─── CANCELAR EVENTO (Calendar + Planilha) ───────────────────────────────────
async function cancelarEvento(
  sheetsToken:string, calToken:string,
  diaN:number, mesN:number, hora:string, nomeHint:string
):Promise<string> {
  const SHEET_ID_C = '1XHF_Jw2dPtw9w8b5Eae3EmPK1CyBepjOyZ7JKWZd7Uk';
  const ABAS_C:Record<number,string>={1:'JAN',2:'FEV',3:'MAR',4:'ABRI',5:'MAI',6:'JUN',7:'JUL',8:'AGO',9:'SET',10:'OUT',11:'NOV',12:'DEZ'};
  const resultados:string[]=[];
  const horaMin=(h:string)=>{const n=normHoraBot(h);if(!n)return 9999;return parseInt(n.slice(0,2))*60+parseInt(n.slice(3));};
  const hAlvo=horaMin(hora);

  // 1. Remover do Google Calendar
  if(calToken){
    try{
      const dStr2=`2026-${String(mesN).padStart(2,'0')}-${String(diaN).padStart(2,'0')}`;
      const calRes=await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${dStr2}T00:00:00-03:00&timeMax=${dStr2}T23:59:59-03:00&singleEvents=true`,{headers:{Authorization:`Bearer ${calToken}`}});
      const eventos=(await calRes.json()).items||[];
      for(const ev of eventos){
        const dt=ev.start?.dateTime||'';
        if(!dt.includes('T'))continue;
        const eh=parseInt(dt.slice(11,13)),em=parseInt(dt.slice(14,16)||'0');
        if(Math.abs((eh*60+em)-hAlvo)<=15){
          const delRes=await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${calToken}`}});
          if(delRes.ok||delRes.status===204) resultados.push(`✅ Calendar: evento "${ev.summary}" removido`);
          else resultados.push(`⚠️ Calendar: erro ao remover "${ev.summary}" (${delRes.status})`);
        }
      }
      if(!resultados.length) resultados.push('⚠️ Calendar: nenhum evento encontrado para este horário');
    }catch(e:any){ resultados.push(`❌ Calendar erro: ${e.message}`); }
  }

  // 2. Limpar linha na planilha (apagar B, C, D, E, H, I — preservar A e G)
  if(sheetsToken){
    try{
      const aba=ABAS_C[mesN]||'MAI';
      const shRes=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_C}/values/${aba}!A1:I500`,{headers:{Authorization:`Bearer ${sheetsToken}`}});
      const rows:string[][]=(await shRes.json()).values||[];
      let linhaAlvo=-1;
      for(let i=0;i<rows.length;i++){
        const r=[...rows[i]];while(r.length<9)r.push('');
        const colA=(r[0]||'').trim();
        if(colA!==String(diaN)&&colA!==String(diaN).padStart(2,'0'))continue;
        const hNorm=normHoraBot(r[6]||'');
        if(hNorm&&Math.abs(horaMin(hNorm)-hAlvo)<=15){linhaAlvo=i+1;break;}
      }
      if(linhaAlvo>0){
        // Limpar colunas B, C, D, E, H, I (preservar A=dia e G=hora)
        const clearRes=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_C}/values/${aba}!B${linhaAlvo}:E${linhaAlvo}?valueInputOption=USER_ENTERED`,{
          method:'PUT',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
          body:JSON.stringify({range:`${aba}!B${linhaAlvo}:E${linhaAlvo}`,values:[['','','','']]})
        });
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID_C}/values/${aba}!H${linhaAlvo}:I${linhaAlvo}?valueInputOption=USER_ENTERED`,{
          method:'PUT',headers:{Authorization:`Bearer ${sheetsToken}`,'Content-Type':'application/json'},
          body:JSON.stringify({range:`${aba}!H${linhaAlvo}:I${linhaAlvo}`,values:[['','']]})
        });
        resultados.push(clearRes.ok?`✅ Planilha L${linhaAlvo}: linha liberada (horário disponível novamente)`:`⚠️ Planilha: erro ao limpar L${linhaAlvo}`);
      } else {
        resultados.push(`⚠️ Planilha: linha não encontrada para ${hora}h dia ${diaN}`);
      }
    }catch(e:any){ resultados.push(`❌ Planilha erro: ${e.message}`); }
  }

  return [`❌ *EVENTO CANCELADO* — ${String(diaN).padStart(2,'0')}/${String(mesN).padStart(2,'0')} às ${hora}`, ...resultados, `👤 ${nomeHint||'cliente'}`].join('\n');
}

// Cache de divergências para o botão "Corrigir Tudo"
const divsCache=new Map<string,any[]>(); // key=chatId, value=array de divs

async function processarDivAdmin(
  sheetsToken:string,calToken:string,
  callbackId:string,data:string,msgId:number,chatIdDiv:number|string=ADMIN_ID
){
  const api=`https://api.telegram.org/bot${BOT_TOKEN}`;
  const parts=data.split(':');
  if(parts[0]!=='div'||parts.length<5)return;

  const acao  = parts[1];
  const tipo  = parts[2];
  const diaN  = parseInt(parts[3]);
  const mesN  = parseInt(parts[4]);
  const hRaw  = parts[5]||'0000';
  const hora  = hRaw.length===4?`${hRaw.slice(0,2)}:${hRaw.slice(2)}`:normHoraBot(hRaw);
  const nome  = parts.slice(6).join(':').trim();

  // Responder callback imediatamente — evita spinner
  await fetch(`${api}/answerCallbackQuery`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({callback_query_id:callbackId,text:'Processando...'})}).catch(()=>{});

  let resultado='';
  try{
    if(acao==='tudo'){
      // ── CORRIGIR TODAS AS DIVERGÊNCIAS ───────────────────────────────
      const cache=divsCache.get(GRUPO_JG_ID)||divsCache.get(String(ADMIN_ID))||[];
      if(cache.length===0){
        resultado='⚠️ Nenhuma divergência em cache. Gere o relatório novamente.';
      }else{
        const linhas=[`🔧 Corrigindo ${cache.length} divergência(s)...`];
        for(const d of cache){
          const acaoD=d.tipo==='so_calendar'?'incluir':'criar';
          const res=await executarCorrecao(
            acaoD,d.tipo,d.dia,d.mes,d.hora,
            d.nome||'',d.tel||'',d.servico||'',d.desc||'',
            sheetsToken,calToken
          );
          linhas.push(res);
          await new Promise(r=>setTimeout(r,500));
        }
        divsCache.delete(GRUPO_JG_ID);divsCache.delete(String(ADMIN_ID));
        resultado=linhas.join('\n');
      }
    }else{
      // ── AÇÃO INDIVIDUAL ───────────────────────────────────────────────
      resultado=await executarCorrecao(
        acao,tipo,diaN,mesN,hora,nome,'','','',
        sheetsToken,calToken
      );
    }
  }catch(e:any){
    console.error('processarDivAdmin ERRO:',e.message);
    resultado=`❌ Erro: ${e.message}`;
  }

  // Editar mensagem — resultado final + remover botões
  await fetch(`${api}/editMessageText`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:chatIdDiv,message_id:msgId,text:resultado,reply_markup:{inline_keyboard:[]}})
  }).catch(()=>{});
}

Deno.serve(async (req) => {
  const _url=new URL(req.url);

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: true, status: 'Bot Los Hombres v13 ativo' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ── Cache de divergências enviado pelo cronRelatorio ─────────────────────
  if(_url.searchParams.get('cacheDivs')==='1'){
    try{
      const body=await req.json();
      if(body.cacheDivs&&Array.isArray(body.cacheDivs)){
        divsCache.set(String(body.adminId||ADMIN_ID),body.cacheDivs);
        console.log(`[CACHE] ${body.cacheDivs.length} divs salvas para Corrigir Tudo`);
      }
    }catch(_){}
    return new Response('ok',{status:200});
  }

  let update: any;
  try { update = await req.json(); }
  catch { return new Response('ok', { status: 200 }); }

  // ── Buscar tokens AGORA enquanto req está vivo ────────────────────────────
  let sheetsToken='', calToken='';
  try{
    const b=createClientFromRequest(req);
    const [rs,rc]=await Promise.all([
      b.asServiceRole.connectors.getConnection('googlesheets').catch(()=>null),
      b.asServiceRole.connectors.getConnection('googlecalendar').catch(()=>null),
    ]);
    sheetsToken=rs?.accessToken||'';
    calToken=rc?.accessToken||'';
  }catch(e:any){ console.error('Erro tokens:',e.message); }

  // Retornar 200 imediatamente — Telegram não pode esperar
  (async () => {
    try {
      const updateId: number = update.update_id;
      if (jaProcessado(updateId)) { console.log(`[SKIP] dup ${updateId}`); return; }
      console.log(`[OK] ${updateId}:`, JSON.stringify(update).slice(0, 180));

      // ── MENSAGEM DE TEXTO ───────────────────────────────────────────────
      if (update.message?.text) {
        const chatId = update.message.chat.id;
        const fromId = update.message.from?.id;
        const texto  = update.message.text;
        const nome   = [update.message.from?.first_name, update.message.from?.last_name].filter(Boolean).join(' ') || `User${chatId}`;
        if (update.message.from?.is_bot)               { console.log('[SKIP] bot'); return; }
        if (update.message.chat?.type === 'channel')   { console.log('[SKIP] canal'); return; }
        if (fromId === ADMIN_ID)                       { console.log('[SKIP] admin'); return; }
        await processarMensagem(req, chatId, texto, nome);
      }

      // ── CHANNEL POST — ignorar ──────────────────────────────────────────
      if (update.channel_post) { console.log('[SKIP] channel_post'); return; }

      // ── CALLBACK QUERY ──────────────────────────────────────────────────
      if (update.callback_query) {
        const fromId     = update.callback_query.from?.id;
        const chatId     = update.callback_query.message?.chat?.id;
        const data       = update.callback_query.data || '';
        const msgId      = update.callback_query.message?.message_id;
        const callbackId = update.callback_query.id;
        const nome       = [update.callback_query.from?.first_name, update.callback_query.from?.last_name].filter(Boolean).join(' ') || `User${chatId}`;
        if (update.callback_query.from?.is_bot) { console.log('[SKIP] bot callback'); return; }

        // Admin (ou membro do grupo JG) clicou num botão de divergência
        if (isAdminContext(fromId, chatId) && data.startsWith('div:')) {
          await processarDivAdmin(sheetsToken, calToken, callbackId, data, msgId, chatId);
          return;
        }

        // Botão CANCELAR EVENTO do alerta de urgência
        if (isAdminContext(fromId, chatId) && data.startsWith('cancel_urgente:')) {
          await fetch(`${TELEGRAM_API}/answerCallbackQuery`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({callback_query_id:callbackId,text:'Cancelando evento...'})}).catch(()=>{});
          const parts = data.split(':'); // cancel_urgente:dia:mes:hora:nome
          const diaN  = parseInt(parts[1]||'0');
          const mesN  = parseInt(parts[2]||'0');
          const horaRaw = parts[3]||'0000';
          const hora  = horaRaw.length===4?`${horaRaw.slice(0,2)}:${horaRaw.slice(2)}`:horaRaw;
          const nomeKey = (parts[4]||'').replace(/_/g,' ');
          const resultado = await cancelarEvento(sheetsToken, calToken, diaN, mesN, hora, nomeKey);
          await fetch(`${TELEGRAM_API}/editMessageText`,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({chat_id:chatId,message_id:msgId,text:resultado,reply_markup:{inline_keyboard:[]}})
          }).catch(()=>{});
          return;
        }

        // Callback de cliente
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId }),
        });
        await processarCallback(req, chatId, data, nome);
      }

    } catch (e: any) { console.error('Erro webhook:', e.message); }
  })();

  return new Response('ok', { status: 200 });
});
