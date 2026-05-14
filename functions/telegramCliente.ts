// telegramCliente - Bot de atendimento Los Hombres para clientes
import OpenAI from "https://esm.sh/openai@4.28.0";

const BOT_TOKEN = Deno.env.get("TELEGRAM_CLIENT_BOT_TOKEN") || "";
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const SYSTEM_PROMPT = `Você é o assistente virtual do Estúdio Los Hombres, especializado em massagens masculinas de alto padrão em Belo Horizonte (Savassi e Betim).

Seu objetivo é acolher o cliente, entender o que ele busca e guiá-lo até o agendamento.

REGRAS:
- Tom: caloroso, acolhedor, sem julgamento, profissional mas humano
- Use emojis com moderação
- Respostas curtas e diretas (máx 3 parágrafos)
- Nunca mencione sexo explicitamente (exceto Summa Experientia quando perguntado diretamente)
- Sempre ofereça o link de agendamento quando o cliente demonstrar interesse

MASSAGENS PRINCIPAIS:
- Relaxante Sensual: relaxamento com toque sensorial envolvente
- Tântrica Experience: bioenergética + Lingam Massagem
- Quick Massage: 25 min, técnica oriental
- Miofascial: liberação miofascial + esportiva
- Nuru Summa: corpo a corpo com gel, ambos nus
- Tântrica Mútua: toque mútuo consciente, ambos nus
- Blind Experience: privação visual, sensações amplificadas
- Massagem dos Deuses: com vinho e petiscos, interação permitida
- HOT: estímulos localizados
- Tie and Teaser: BDSM sensorial
- Hidrotantra: aquática + hidromassagem
- Summa Experientia: R$ 1.350, única com interação íntima (PrEP + preservativo)
- Massagem 4 Mãos: dois terapeutas
- Casais: Tântrica, Relaxante Sensual e Nuru para casais

AGENDAMENTO:
- Savassi: https://calendar.app.google/jBk4U8zf5WGb73MH6
- Betim: https://calendar.app.google/dandDDiGYKtD36Q19
- Sinal: R$ 30 via PIX CNPJ 17342740000109 (JG Espaço Multserviços)
- Documentos: RG ou CNH obrigatório

ENDEREÇOS:
- Savassi: Rua Tomé de Souza, 503, Sala 208
- Betim: Rua Pernambuco, 341 - Bairro Nossa Senhora das Graças

WHATSAPP: (31) 98324-4713
SITE: https://www.loshombres.com.br/
TABELA DE PREÇOS: https://www.loshombres.com.br/tabela.html

Quando cliente perguntar sobre "tem sexo?": explique que não inclui relação sexual (exceto Summa Experientia).
Quando cliente quiser agendar: pergunte qual unidade e mande o link correspondente.`;

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
}

async function sendTyping(chatId: number) {
  await fetch(`${TG_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  try {
    const body = await req.json();
    const message = body?.message;
    
    if (!message || !message.text) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const userText = message.text;
    const firstName = message.from?.first_name || "";

    // Mostrar "digitando..."
    await sendTyping(chatId);

    // Boas-vindas no /start
    if (userText === "/start") {
      const welcome = `Olá${firstName ? ", " + firstName : ""}! 👋 Seja bem-vindo ao <b>Estúdio Los Hombres</b> ✨

Somos especializados em massagens masculinas de alto padrão em Belo Horizonte, com unidades na <b>Savassi</b> e em <b>Betim</b>.

Estou aqui pra te ajudar a escolher a experiência ideal e tirar qualquer dúvida. O que te trouxe até aqui hoje?`;
      await sendMessage(chatId, welcome);
      return new Response("OK", { status: 200 });
    }

    // Chamar OpenAI para resposta
    const openai = new OpenAI({ apiKey: OPENAI_KEY });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "Desculpe, tente novamente em instantes.";
    
    await sendMessage(chatId, reply);
    
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Erro:", err);
    return new Response("OK", { status: 200 });
  }
}
