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

        // 4. Registrar transação para cada vendedor
        const { data: books } = await supabase
          .from('books')
          .select('id, preco, vendedor_id, titulo')
          .in('id', bookIds)

        if (books?.length) {
          await supabase.from('transactions').insert(
            books.map(b => ({
              vendedor_id: b.vendedor_id,
              order_id:    orderId,
              valor:       b.preco,
              tipo:        'VENDA' as const,
              status:      'PAGO'  as const,
              descricao:   `Venda: "${b.titulo}"`,
            }))
          )
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
