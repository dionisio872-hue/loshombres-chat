/**
 * TELEGRAM WEBHOOK — Los Hombres Estúdio
 * Responde automaticamente com regras fixas (0 crédito de mensagem IA)
 * Só escala pra IA em casos que não consegue resolver
 *
 * ANTI-DUPLICATE: cache de update_id para evitar processamento duplo
 */

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || '';

// ─── DEDUPLICAÇÃO ─────────────────────────────────────────────────────────────
// Cache em memória dos últimos 500 update_ids processados
// Evita resposta dupla quando o Telegram reenvia o webhook por timeout

const processedIds = new Set<number>();
const MAX_CACHE = 500;

function jaProcessado(updateId: number): boolean {
  if (processedIds.has(updateId)) return true;
  processedIds.add(updateId);
  // Limpar cache quando ficar grande demais
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
  {
    chaves: ['relaxante sensual', 'relaxante', 'sensual'],
    nome: 'Relaxante Sensual',
    audio: AUDIOS.relaxante,
    preco: 'R$ 280',
    preco_desc: 'R$ 224 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Uma massagem que combina relaxamento profundo com toque sensorial envolvente. Indicada para quem busca descanso do corpo com presença e calor humano.'
  },
  {
    chaves: ['tantrica experience', 'tântrica experience', 'tantra experience', 'tantrica', 'tântrica', 'lingam'],
    nome: 'Tântrica Experience',
    audio: AUDIOS.tantrica,
    preco: 'R$ 350',
    preco_desc: 'R$ 280 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Uma vivência bioenergética e sensorial completa, com a prática do Lingam Massagem. Para quem quer ir além do físico e reconectar energia vital.'
  },
  {
    chaves: ['quick', 'rápida', 'rapida', '25 min', '25min'],
    nome: 'Quick Massage',
    audio: AUDIOS.quick,
    preco: 'R$ 180',
    preco_desc: 'R$ 144 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Sessão de 25 minutos com técnica oriental e deslizamento corporal. Prática, direta e eficiente para quem tem pouco tempo mas quer qualidade.'
  },
  {
    chaves: ['miofascial', 'esportiva', 'fascia'],
    nome: 'Miofascial',
    audio: AUDIOS.miofascial,
    preco: 'R$ 300',
    preco_desc: 'R$ 240 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Liberação miofascial combinada com massagem esportiva. Realizada em roupas íntimas, com foco na soltura profunda dos tecidos e alívio de tensões acumuladas.'
  },
  {
    chaves: ['nuru summa', 'nuru', 'corpo a corpo'],
    nome: 'Nuru Summa',
    audio: AUDIOS.nuru,
    preco: 'R$ 450',
    preco_desc: 'R$ 360 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Deslizamento corpo a corpo com óleo especial, ambos sem roupa. Uma das experiências mais imersivas e sensoriais do estúdio.'
  },
  {
    chaves: ['mútua', 'mutua', 'tantrica mutua', 'tântrica mútua'],
    nome: 'Tântrica Mútua',
    audio: AUDIOS.mutua,
    preco: 'R$ 400',
    preco_desc: 'R$ 320 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Toque consciente e mútuo, ambos nus. Uma experiência guiada de troca sensorial e presença plena.'
  },
  {
    chaves: ['blind', 'às cegas', 'as cegas', 'venda', 'privação visual', 'privacao visual'],
    nome: 'Blind Experience',
    audio: AUDIOS.blind,
    preco: 'R$ 350',
    preco_desc: 'R$ 280 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Com os olhos cobertos, cada toque é amplificado. A privação visual transforma a percepção e intensifica todas as sensações.'
  },
  {
    chaves: ['deuses', 'vinho', 'petisco', 'massagem dos deuses'],
    nome: 'Massagem dos Deuses',
    audio: AUDIOS.deuses,
    preco: 'R$ 500',
    preco_desc: 'R$ 400 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Imersão sensorial completa com vinho e petiscos. Interação permitida. Uma experiência que vai além da massagem.'
  },
  {
    chaves: ['hot massage', 'hot'],
    nome: 'HOT',
    audio: AUDIOS.hot,
    preco: 'R$ 320',
    preco_desc: 'R$ 256 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Estímulos sensoriais localizados e concentrados. Intensidade com controle, para quem busca algo mais focalizado.'
  },
  {
    chaves: ['bdsm', 'tie and teaser', 'tie', 'teaser', 'dominação', 'dominacao'],
    nome: 'Tie and Teaser BDSM',
    audio: AUDIOS.bdsm,
    preco: 'R$ 450',
    preco_desc: 'R$ 360 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Experiência sensorial guiada por controle e provocação consciente. Exploração segura e respeitosa dos limites do prazer.'
  },
  {
    chaves: ['hidrotantra', 'hidro tantra', 'banheira', 'aquática', 'aquatica'],
    nome: 'Hidrotantra',
    audio: AUDIOS.hidro,
    preco: 'R$ 500',
    preco_desc: 'R$ 400 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Vivência aquática em banheira de hidromassagem combinada com toque tântrico. Relaxamento total do corpo e da mente.'
  },
  {
    chaves: ['burn', 'térmica', 'termica', 'fogo', 'quente'],
    nome: 'Burn',
    audio: AUDIOS.burn,
    preco: 'R$ 380',
    preco_desc: 'R$ 304 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Estímulos térmicos e sensoriais que criam contrastes únicos de sensação ao longo de toda a experiência.'
  },
  {
    chaves: ['summa experientia', 'summa', 'íntima', 'intima'],
    nome: 'Summa Experientia',
    audio: AUDIOS.summa,
    preco: 'R$ 1.350',
    preco_desc: 'R$ 1.350 (valor fixo)',
    texto: 'A experiência máxima do estúdio. A única sessão com interação íntima integrada. Protocolos de saúde rigorosos: PrEP + preservativo obrigatórios.'
  },
  {
    chaves: ['4 mãos', '4 maos', 'quatro mãos', 'quatro maos', 'dois terapeutas'],
    nome: 'Massagem 4 Mãos',
    audio: AUDIOS['4maos'],
    preco: 'R$ 500',
    preco_desc: 'R$ 400 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Dois terapeutas trabalhando em sincronia perfeita. Uma experiência de cobertura total e sensações simultâneas.'
  },
  {
    chaves: ['podoloterapia', 'podologia'],
    nome: 'Podoloterapia',
    audio: AUDIOS.podo,
    preco: 'R$ 200',
    preco_desc: 'R$ 160 (com 20% de desconto para 30 dias de antecedência)',
    texto: 'Tratamento especializado nos pés com técnicas de reflexologia e relaxamento. Muito mais do que uma massagem comum nos pés.'
  },
  {
    chaves: ['casal', 'namorado', 'parceiro'],
    nome: 'Massagens para Casais',
    audio: AUDIOS.tantra_casal,
    preco: 'a partir de R$ 500',
    preco_desc: 'Consulte os valores para cada modalidade',
    texto: 'Temos três opções para casais: Relaxante Sensual Casal, Tântrica Casal e Nuru Casal. Qual delas te interessa mais?'
  },
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
  if (/^(oi|ola|ola|hello|hey|hi|bom dia|boa tarde|boa noite|tudo bem|tudo bom|boa|e ai|e a|salve|opa)\b/.test(n)) return 'saudacao';
  if (/quero (te |te )?conhecer|me conhecer|se conhecer|conhecer voce|conhecer vc|sobre voce|sobre o jonathan/.test(n)) return 'saudacao';
  if (/preco|valor|quanto|custa|tabela|valores/.test(n)) return 'preco';
  if (/agendar|marcar|reservar|disponib|horario|agenda|quando/.test(n)) return 'agendar';
  if (/onde|endereco|endereço|localiz|savassi|betim|unidade/.test(n)) return 'localizacao';
  if (/sexo|transar|fazer sexo|programa|final feliz/.test(n)) return 'sexo';
  if (/tatuagem|tatuar|tattoo/.test(n)) return 'tatuagem';
  if (/pix|sinal|pagamento|pagar|comprovante/.test(n)) return 'pagamento';
  if (/obrigad|valeu|muito obrigado|agradeço|agradeco/.test(n)) return 'agradecimento';
  if (/vaga|trabalhar|emprego|comissao|comissão|massagista/.test(n)) return 'vaga';
  if (/curso|aprender|formacao|formação|workshop/.test(n)) return 'curso';
  if (/micose|fungo|pele|alergia/.test(n)) return 'micose';
  if (/vergonha|insegur|gordo|magro|corpo/.test(n)) return 'vergonha';
  if (/listar|lista|opcoes|opções|tipos|modalidades|o que tem|o que voce faz/.test(n)) return 'listar';
  return 'desconhecido';
}

async function sendText(chatId: number, text: string, replyMarkup?: object) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
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
  await sendText(chatId,
    `Olá! Que bom que você chegou até aqui. Sou Jonathan, massagista especializado em atendimento masculino de alto padrão em Belo Horizonte.\n\nAtendo nas unidades da Savassi e Betim, com total sigilo e sem julgamentos.\n\nMe conta: o que te trouxe até aqui hoje? Está buscando relaxamento, uma experiência mais intensa ou tem alguma massagem em mente?`,
    { inline_keyboard: [
      [{ text: '💆 Ver todas as massagens', callback_data: 'listar' }],
      [{ text: '💰 Ver preços', callback_data: 'preco' }],
      [{ text: '📅 Agendar uma sessão', callback_data: 'agendar' }],
      [{ text: '📍 Onde ficamos', callback_data: 'localizacao' }],
    ]}
  );
}

async function responderListar(chatId: number) {
  await sendText(chatId,
    `Temos <b>18 modalidades</b> de massagem. Aqui estão as principais:\n\n💆 Relaxante Sensual\n🌀 Tântrica Experience\n⚡ Quick Massage (25min)\n💪 Miofascial\n🛁 Nuru Summa\n🤝 Tântrica Mútua\n🙈 Blind Experience\n🍷 Massagem dos Deuses\n🔥 HOT\n⛓️ Tie and Teaser BDSM\n💧 Hidrotantra\n🌡️ Burn\n👑 Summa Experientia\n🙌 Massagem 4 Mãos\n🦶 Podoloterapia\n👫 Tântrica Casal\n💑 Relaxante Sensual Casal\n🌊 Nuru Casal\n\nQual dessas te chamou atenção? Posso te contar mais detalhes e enviar um áudio explicativo.`
  );
}

async function responderMassagem(chatId: number, m: typeof MASSAGENS[0]) {
  await sendText(chatId,
    `<b>${m.nome}</b>\n\n${m.texto}\n\n💰 <b>Valor:</b> ${m.preco}\n📆 <b>Com antecedência de 30 dias:</b> ${m.preco_desc}\n\nVou te enviar um áudio com todos os detalhes:`
  );
  await sendAudio(chatId, m.audio);
  await sendText(chatId,
    `Para agendar a sua sessão, escolha sua unidade:`,
    { inline_keyboard: [
      [{ text: '📍 Savassi', url: 'https://calendar.app.google/jBk4U8zf5WGb73MH6' }],
      [{ text: '📍 Betim', url: 'https://calendar.app.google/dandDDiGYKtD36Q19' }],
    ]}
  );
}

async function responderPreco(chatId: number) {
  await sendText(chatId,
    `Nossa tabela completa de valores está disponível aqui:\n\n🔗 <a href="https://www.loshombres.com.br/tabela.html">www.loshombres.com.br/tabela.html</a>\n\n📆 Agendamentos com <b>30 dias de antecedência</b> têm <b>20% de desconto</b> sobre qualquer serviço.\n\nSe quiser saber o valor de uma massagem específica, é só me dizer qual!`
  );
}

async function responderAgendar(chatId: number) {
  await sendText(chatId,
    `Para confirmar sua sessão:\n\n1️⃣ Escolha uma data disponível na agenda da unidade desejada\n2️⃣ Pague o sinal de <b>R$ 30,00</b> via PIX\n   — Chave PIX (CNPJ): <code>17342740000109</code>\n   — Favorecido: JG Espaço Multserviços\n3️⃣ Envie o comprovante aqui\n\nEm qual unidade prefere?`,
    { inline_keyboard: [
      [{ text: '📍 Savassi — ver horários', url: 'https://calendar.app.google/jBk4U8zf5WGb73MH6' }],
      [{ text: '📍 Betim — ver horários', url: 'https://calendar.app.google/dandDDiGYKtD36Q19' }],
    ]}
  );
}

async function responderLocalizacao(chatId: number) {
  await sendText(chatId,
    `📍 <b>Savassi</b>\nRua Tomé de Souza, 503 — Sala 208\nBelo Horizonte, MG\n\n📍 <b>Betim</b>\nRua Pernambuco, 341 — Bairro Nossa Senhora das Graças\nBetim, MG\n\n📞 WhatsApp: <a href="https://wa.me/5531983244713">(31) 98324-4713</a>`
  );
}

async function responderSexo(chatId: number) {
  await sendText(chatId,
    `Nosso estúdio oferece massagens terapêuticas e sensoriais, não relações sexuais.\n\nA única sessão com <b>interação íntima integrada</b> é a <b>Summa Experientia</b> (R$ 1.350), que segue protocolos rigorosos de saúde: PrEP + preservativo obrigatórios.\n\nSe quiser saber mais sobre ela, é só pedir!`
  );
}

async function responderPagamento(chatId: number) {
  await sendText(chatId,
    `O sinal para reservar sua sessão é de <b>R$ 30,00</b>.\n\nPIX:\n— Tipo: CNPJ\n— Chave: <code>17342740000109</code>\n— Favorecido: JG Espaço Multserviços\n\nApós o pagamento, envie o comprovante aqui para confirmar sua reserva. 📸`
  );
}

async function responderAgradecimento(chatId: number) {
  await sendText(chatId,
    `Com prazer! Qualquer dúvida, estou aqui. Até a sua sessão! 🌿`
  );
}

async function responderVaga(chatId: number) {
  await sendText(chatId,
    `Temos vagas abertas para massagistas!\n\nComissão: <b>30%</b> (espaço próprio) ou <b>40%</b> (usando estrutura do estúdio).\n\nPrimeiro passo é preencher o formulário:\n🔗 <a href="https://docs.google.com/forms/d/e/1FAIpQLSf2a8ePAZy44mArO-zijJPt23RQHyB4a1G5FILIffz8XJQqjQ/viewform">Formulário de vagas</a>\n\nEm seguida, entraremos em contato pelo WhatsApp de recrutamento: <a href="https://wa.me/5531987870330">(31) 98787-0330</a>`
  );
}

async function responderCurso(chatId: number) {
  await sendText(chatId,
    `Oferecemos cursos de massagem:\n\n📚 Automassagem — R$ 500\n📚 Massagem Relaxamento e Conexão — R$ 500\n📚 Nuru Summa — R$ 1.200 a R$ 1.300\n📚 Workshop Intensivo Individual (2 dias) — R$ 2.000\n\n3 cursos juntos: <b>10% de desconto</b> → R$ 2.070\n\nLocal: Savassi, Sala 208.\n\nMais informações: <a href="https://www.loshombres.com.br/#courses">loshombres.com.br/#courses</a>`
  );
}

async function responderMicose(chatId: number) {
  await sendText(chatId,
    `Para garantir a sua segurança e a do terapeuta, orientamos aguardar a cicatrização completa da pele antes de agendar qualquer sessão.\n\nAssim que estiver bem, estaremos prontos para te receber! 🌿`
  );
}

async function responderVergonha(chatId: number) {
  await sendText(chatId,
    `O Estúdio Los Hombres atende corpos reais, de todos os tipos, tamanhos e histórias.\n\nAqui não existe julgamento. O ambiente é discreto, acolhedor e pensado para que você se sinta completamente à vontade desde o primeiro momento. 🌿`
  );
}

async function responderTatuagem(chatId: number) {
  await sendText(chatId,
    `Para informações sobre tatuagem, entre em contato pelo:\n📱 <a href="https://wa.me/5531991266270">WhatsApp (31) 99126-6270</a>`
  );
}

// ─── FALLBACK COM IA (apenas casos complexos) ─────────────────────────────────

async function responderComIA(chatId: number, mensagem: string) {
  if (!OPENAI_KEY) {
    await sendText(chatId, 'Para essa dúvida específica, entre em contato pelo WhatsApp: <a href="https://wa.me/5531983244713">(31) 98324-4713</a>');
    return;
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [
        { role: 'system', content: `Você é o assistente do Estúdio Los Hombres, massagens masculinas de alto padrão em BH. Responda de forma breve, humana e acolhedora. Nunca use travessões. WhatsApp: (31) 98324-4713. Site: www.loshombres.com.br. PIX CNPJ 17342740000109 (sinal R$30).` },
        { role: 'user', content: mensagem }
      ]
    })
  });
  const data = await res.json();
  const resposta = data.choices?.[0]?.message?.content || 'Para essa dúvida, entre em contato: (31) 98324-4713';
  await sendText(chatId, resposta);
}

// ─── PROCESSADOR PRINCIPAL ────────────────────────────────────────────────────

async function processarMensagem(chatId: number, texto: string) {
  // 1. Verificar se é sobre uma massagem específica
  const massagem = detectarMassagem(texto);
  if (massagem) {
    await responderMassagem(chatId, massagem);
    return;
  }

  // 2. Intenções gerais
  const intencao = detectarIntencao(texto);
  switch (intencao) {
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
    case 'tatuagem': await responderTatuagem(chatId); break;
    default:
      await responderComIA(chatId, texto);
  }
}

async function processarCallback(chatId: number, data: string) {
  switch (data) {
    case 'listar': await responderListar(chatId); break;
    case 'agendar': await responderAgendar(chatId); break;
    case 'preco': await responderPreco(chatId); break;
    case 'localizacao': await responderLocalizacao(chatId); break;
    default: await responderSaudacao(chatId);
  }
}

// ─── WEBHOOK HANDLER ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: true, status: 'Bot ativo' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response('ok', { status: 200 });
  }

  // ── RESPONDER 200 IMEDIATAMENTE ────────────────────────────────────────────
  // Isso impede o Telegram de reenviar o webhook por timeout (causa das duplicatas)
  const responsePromise = new Response('ok', { status: 200 });

  // Processar de forma assíncrona APÓS retornar o 200
  (async () => {
    try {
      const updateId: number = update.update_id;

      // ── DEDUPLICAÇÃO ────────────────────────────────────────────────────────
      // Se esse update_id já foi processado, ignorar silenciosamente
      if (jaProcessado(updateId)) {
        console.log(`[SKIP] update_id ${updateId} já processado — ignorando duplicata`);
        return;
      }

      console.log(`[OK] Processando update_id ${updateId}:`, JSON.stringify(update).slice(0, 200));

      // Mensagem de texto
      if (update.message?.text) {
        const chatId = update.message.chat.id;
        const texto = update.message.text;
        await processarMensagem(chatId, texto);
      }

      // Callback de botão inline
      if (update.callback_query) {
        const chatId = update.callback_query.message.chat.id;
        const data = update.callback_query.data;
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: update.callback_query.id }),
        });
        await processarCallback(chatId, data);
      }

    } catch (e: any) {
      console.error('Erro webhook:', e.message);
    }
  })();

  return responsePromise;
});
