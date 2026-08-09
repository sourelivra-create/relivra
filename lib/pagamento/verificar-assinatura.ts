import crypto from 'crypto'

// Verifica se uma notificação de webhook realmente veio do Mercado
// Pago, usando o algoritmo oficial deles (HMAC-SHA256 sobre um
// template com id + request-id + timestamp, comparado ao header
// x-signature). Sem isso, qualquer pessoa na internet pode chamar
// nosso webhook direto e forçar o servidor a reprocessar qualquer
// payment_id que ela souber ou adivinhar.
export function verificarAssinaturaMP(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null
): boolean {
  if (!xSignature || !xRequestId || !dataId) return false

  const partes = xSignature.split(',')
  const ts = partes.find(p => p.trim().startsWith('ts='))?.split('=')[1]
  const v1 = partes.find(p => p.trim().startsWith('v1='))?.split('=')[1]
  if (!ts || !v1) return false

  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const assinaturaCalculada = crypto
    .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET!)
    .update(template)
    .digest('hex')

  // timingSafeEqual em vez de === — comparação de string comum vaza
  // timing (quanto mais caracteres batem, mais devagar falha), o que
  // teoricamente ajuda um atacante a "adivinhar" a assinatura certa
  // caractere por caractere. Não é o risco principal aqui, mas já que
  // estamos mexendo em verificação de segurança, fazemos direito.
  const bufferCalculado = Buffer.from(assinaturaCalculada)
  const bufferRecebido = Buffer.from(v1)
  if (bufferCalculado.length !== bufferRecebido.length) return false

  return crypto.timingSafeEqual(bufferCalculado, bufferRecebido)
}
