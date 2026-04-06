import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface PersonalizeParams {
  template: string;
  tone: string;
  debtor: {
    name: string;
    riskScore: number;
    avgPaymentDelay: number;
    responseRate: number;
    bestContactChannel?: string | null;
    bestContactTime?: string | null;
  };
}

export async function personalizeMessage({
  template,
  tone,
  debtor,
}: PersonalizeParams): Promise<string> {
  const systemPrompt = `Sos un experto en cobranzas empático. Personalizá este mensaje de cobro según el perfil del deudor.

Reglas:
- Si riskScore < 30 (buen pagador): tono amigable, asumir que se olvidó
- Si riskScore 30-60 (intermedio): tono profesional, dar opciones
- Si riskScore > 60 (mal pagador): tono firme pero respetuoso, crear urgencia
- NUNCA amenazar | Siempre mantener el link de pago {link_pago} | Máximo 200 palabras | Español argentino
- Conservá todas las variables entre llaves: {nombre}, {monto}, {concepto}, {link_pago}, {empresa}, {dias_atraso}, {fecha}`;

  const userPrompt = `Perfil: riskScore=${debtor.riskScore}, avgDelay=${debtor.avgPaymentDelay}días, responseRate=${debtor.responseRate}%, bestChannel=${debtor.bestContactChannel ?? "desconocido"}, bestTime=${debtor.bestContactTime ?? "desconocido"}
Mensaje original: ${template}
Tono deseado: ${tone}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  return response.choices[0].message.content ?? template;
}
