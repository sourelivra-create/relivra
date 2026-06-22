import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import MercadoPagoConfig, { Payment } from 'mercadopago'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

// POST /api/pagamento/processar – Recebe os dados do Payment Brick
// (já tokenizados pelo SDK do MP no navegador) e processa o pagamento
// diretamente via API, sem o cliente saber do nosso back-end ou do MP.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { order_id, formData } = body

    if (!order_id || !formData) {
      return NextResponse.json({ error: 'Dados de pagamento incompletos' }, { status: 400 })
    }

    // Confirma que a order pertence a esse usuário e está pendente
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('comprador_id', user.id)
      .single()

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    if (order.status !== 'PENDENTE') {
      return NextResponse.json({ error: 'Pedido já foi processado' }, { status: 400 })
    }

    // O Payment Brick já envia os dados no formato esperado pela API
    // de pagamentos do MP (token do cartão, método, parcelas, payer, etc.)
    const payment = new Payment(mp)
    const resultado = await payment.create({
      body: {
        transaction_amount: Number(order.valor_total),
        token: formData.token,
        description: `Pedido RELIVRA ${order.id}`,
        installments: formData.installments || 1,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,
        payer: {
          email: formData.payer?.email || user.email || '',
          identification: formData.payer?.identification,
        },
        external_reference: order.id,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pagamento/webhook`,
      },
    })

    // Atualiza a order com o resultado imediato (o webhook também vai
    // confirmar depois, mas aqui já damos feedback rápido ao usuário)
    const statusFinal = resultado.status === 'approved' ? 'PAGO' : 'PENDENTE'

    await supabase
      .from('orders')
      .update({
        status: statusFinal,
        mp_payment_id: String(resultado.id),
      })
      .eq('id', order_id)

    // Se aprovado na hora (comum em Pix e em alguns cartões de débito),
    // já marca os livros como vendidos sem esperar o webhook
    if (statusFinal === 'PAGO') {
      const { data: items } = await supabase
        .from('order_items')
        .select('book_id')
        .eq('order_id', order_id)

      if (items?.length) {
        await supabase.from('books').update({ vendido: true }).in('id', items.map(i => i.book_id))
      }
    }

    return NextResponse.json({
      status: resultado.status,             // approved, pending, rejected, in_process
      status_detail: resultado.status_detail,
      payment_id: resultado.id,
      // Para Pix: o QR code e código copia-e-cola vêm aqui
      qr_code: resultado.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: resultado.point_of_interaction?.transaction_data?.qr_code_base64,
    })
  } catch (error) {
    console.error('[API /pagamento/processar POST]', error)
    return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 })
  }
}
