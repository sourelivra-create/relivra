import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import MercadoPagoConfig, { Preference, Payment } from 'mercadopago'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

// POST /api/pagamento – Criar preferência MP
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { livro_ids } = await request.json()
    if (!livro_ids?.length) return NextResponse.json({ error: 'Livros obrigatórios' }, { status: 400 })

    // Buscar livros
    const { data: livros } = await supabase
      .from('books')
      .select('*, vendedor:profiles(nome)')
      .in('id', livro_ids)
      .eq('vendido', false)

    if (!livros?.length) return NextResponse.json({ error: 'Livros não disponíveis' }, { status: 400 })

    const valorTotal = livros.reduce((acc, l) => acc + Number(l.preco), 0)

    // Criar order no banco
    const { data: order } = await supabase
      .from('orders')
      .insert({
        comprador_id: user.id,
        valor_total: valorTotal,
        status: 'PENDENTE',
        tipo: 'COMPRA',
      })
      .select()
      .single()

    if (!order) return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 })

    // Inserir itens
    await supabase.from('order_items').insert(
      livros.map(l => ({ order_id: order.id, book_id: l.id, preco: l.preco }))
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    // Criar preferência Mercado Pago
    const preference = new Preference(mp)
    const { id: preferenceId, init_point } = await preference.create({
      body: {
        items: livros.map(l => ({
          id: l.id,
          title: l.titulo,
          description: `${l.autor} – Estado: ${l.estado}`,
          quantity: 1,
          unit_price: Number(l.preco),
          currency_id: 'BRL',
        })),
        payer: { email: user.email || '' },
        back_urls: {
          success: `${appUrl}/painel/vendas?status=sucesso&order=${order.id}`,
          failure: `${appUrl}/painel/vendas?status=erro&order=${order.id}`,
          pending: `${appUrl}/painel/vendas?status=pendente&order=${order.id}`,
        },
        auto_return: 'approved',
        external_reference: order.id,
        notification_url: `${appUrl}/api/pagamento/webhook`,
        payment_methods: {
          excluded_payment_methods: [],
          installments: 3,
        },
      },
    })

    // Salvar preference_id na order
    await supabase
      .from('orders')
      .update({ mp_preference_id: preferenceId })
      .eq('id', order.id)

    return NextResponse.json({
      preference_id: preferenceId,
      init_point,
      order_id: order.id,
    })
  } catch (error) {
    console.error('[API /pagamento POST]', error)
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}

// POST /api/pagamento/webhook – Receber notificação do MP
export async function webhookHandler(request: NextRequest) {
  const body = await request.json()

  if (body.type === 'payment') {
    const paymentId = body.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    try {
      const supabase = createAdminClient()
      const payment = new Payment(mp)
      const pagamento = await payment.get({ id: paymentId })

      const orderId = pagamento.external_reference
      if (!orderId) return NextResponse.json({ ok: true })

      const status = pagamento.status === 'approved' ? 'PAGO' : 'PENDENTE'

      if (status === 'PAGO') {
        // Atualizar order
        await supabase
          .from('orders')
          .update({ status: 'PAGO', mp_payment_id: String(paymentId) })
          .eq('id', orderId)

        // Marcar livros como vendidos
        const { data: items } = await supabase
          .from('order_items')
          .select('book_id')
          .eq('order_id', orderId)

        if (items?.length) {
          const bookIds = items.map(i => i.book_id)
          await supabase.from('books').update({ vendido: true }).in('id', bookIds)

          // Registrar transações para vendedores
          const { data: books } = await supabase
            .from('books')
            .select('id, preco, vendedor_id')
            .in('id', bookIds)

          if (books?.length) {
            await supabase.from('transactions').insert(
              books.map(b => ({
                vendedor_id: b.vendedor_id,
                order_id: orderId,
                valor: b.preco,
                tipo: 'VENDA' as const,
                status: 'PAGO' as const,
                descricao: `Venda processada – Pedido ${orderId}`,
              }))
            )
          }
        }
      }
    } catch (err) {
      console.error('[Webhook MP]', err)
    }
  }

  return NextResponse.json({ ok: true })
}
