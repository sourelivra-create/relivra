import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import MercadoPagoConfig, { Payment } from 'mercadopago'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // MP envia notificações de vários tipos — só processa pagamentos
    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const paymentId = body.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    const supabase = createAdminClient()
    const payment  = new Payment(mp)

    // Buscar detalhes do pagamento na API do MP
    const pagamento = await payment.get({ id: paymentId })
    const orderId   = pagamento.external_reference

    if (!orderId) return NextResponse.json({ ok: true })

    if (pagamento.status === 'approved') {
      // 1. Atualizar order para PAGO
      await supabase
        .from('orders')
        .update({ status: 'PAGO', mp_payment_id: String(paymentId) })
        .eq('id', orderId)

      // 2. Buscar itens do pedido
      const { data: items } = await supabase
        .from('order_items')
        .select('book_id')
        .eq('order_id', orderId)

      if (items?.length) {
        const bookIds = items.map(i => i.book_id)

        // 3. Marcar livros como vendidos
        await supabase.from('books').update({ vendido: true }).in('id', bookIds)

        // 4. Criar entrada no ledger financeiro — uma por livro/vendedor.
        // Usa mp_payment_id como chave de idempotência: se o webhook for
        // chamado de novo para o mesmo pagamento (comum no MP), o UNIQUE
        // da coluna impede duplicar a entrada financeira.
        const { data: books } = await supabase
          .from('books')
          .select('id, preco, vendedor_id, titulo')
          .in('id', bookIds)

        if (books?.length) {
          // Taxa real cobrada pelo MP nesse pagamento específico — vem
          // do próprio objeto de pagamento. IMPORTANTE: o formato exato
          // de fee_details não está 100% documentado para todos os
          // métodos de pagamento, então usamos um fallback seguro: se
          // não vier preenchido, assumimos a taxa de referência (4,99%)
          // em vez de deixar a taxa zerada silenciosamente — isso evita
          // que o vendedor receba mais do que deveria por uma falha de
          // leitura do campo, o que seria prejuízo real para a Relivra.
          const valorTotalPago = Number(pagamento.transaction_amount || 0)

          const taxaRealMPDeclarada = pagamento.fee_details?.reduce(
            (acc, f) => acc + (f.amount || 0), 0
          ) || 0

          const TAXA_REFERENCIA = 0.0499
          const taxaRealMP = taxaRealMPDeclarada > 0
            ? taxaRealMPDeclarada
            : Number((valorTotalPago * TAXA_REFERENCIA).toFixed(2))

          if (taxaRealMPDeclarada === 0) {
            console.warn(
              `[Webhook] fee_details vazio para payment ${paymentId} — usando taxa de referência como fallback`
            )
          }

          for (const book of books) {
            const precoVenda = Number(book.preco)
            // Rateia a taxa real do MP proporcionalmente ao preço de
            // cada livro, caso o pedido tenha múltiplos itens
            const proporcao = valorTotalPago > 0 ? precoVenda / valorTotalPago : 1
            const taxaMpRateada = Number((taxaRealMP * proporcao).toFixed(2))
            const taxaRelivra = Number((precoVenda * 0.10).toFixed(2))
            const valorLiquido = Number((precoVenda - taxaMpRateada - taxaRelivra).toFixed(2))

            // Chave de idempotência composta: mesmo pagamento + mesmo
            // livro nunca gera duas entradas (insert simplesmente falha
            // silenciosamente na segunda tentativa, graças ao UNIQUE)
            await supabase
              .from('ledger_financeiro')
              .insert({
                order_id: orderId,
                vendedor_id: book.vendedor_id,
                book_id: book.id,
                valor_bruto: precoVenda,
                taxa_mercado_pago: taxaMpRateada,
                taxa_relivra: taxaRelivra,
                valor_liquido_vendedor: valorLiquido,
                mp_payment_id: `${paymentId}_${book.id}`,
                status: 'PENDENTE',
              })
              .select()
              // Erro de UNIQUE violado é esperado em retries — ignora
              .then(({ error }) => {
                if (error && !error.message.includes('duplicate')) {
                  console.error('[Ledger insert]', error)
                }
              })
          }
        }
      }
    } else if (pagamento.status === 'cancelled' || pagamento.status === 'rejected') {
      await supabase
        .from('orders')
        .update({ status: 'CANCELADO' })
        .eq('id', orderId)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Webhook MP]', error)
    // Retorna 200 mesmo em erro para o MP não retentar indefinidamente
    return NextResponse.json({ ok: true })
  }
}
