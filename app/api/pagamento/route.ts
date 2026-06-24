import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import MercadoPagoConfig, { Preference } from 'mercadopago'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

// POST /api/pagamento – Cria a order + preferência para o Checkout Brick
// renderizar embutido no site (sem redirecionar para fora)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { livro_ids, quantidade } = await request.json()
    if (!livro_ids?.length) return NextResponse.json({ error: 'Livros obrigatórios' }, { status: 400 })

    // Por ora o checkout só suporta comprar 1 livro por vez (mas N
    // unidades dele) — múltiplos livros diferentes no carrinho ainda
    // não é suportado nessa tela
    const quantidadeDesejada = Math.max(1, Number(quantidade) || 1)

    // Buscar livro
    const { data: livros } = await supabase
      .from('books')
      .select('*, vendedor:profiles(nome)')
      .in('id', livro_ids)
      .eq('vendido', false)

    if (!livros?.length) return NextResponse.json({ error: 'Livros não disponíveis' }, { status: 400 })

    // Valida que o estoque suporta a quantidade pedida — proteção
    // contra comprar mais do que existe (ex: duas abas comprando
    // a última unidade ao mesmo tempo)
    const livroPrincipal = livros[0]
    if (quantidadeDesejada > (livroPrincipal.quantidade_disponivel ?? 1)) {
      return NextResponse.json(
        { error: 'Quantidade solicitada maior que o disponível' },
        { status: 400 }
      )
    }

    const valorTotal = Number(livroPrincipal.preco_final) * quantidadeDesejada

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

    // Inserir item com a quantidade desejada
    await supabase.from('order_items').insert({
      order_id: order.id,
      book_id: livroPrincipal.id,
      preco: livroPrincipal.preco_final,
      quantidade: quantidadeDesejada,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    // Cria a preferência — usada pelo Brick para saber os itens e valores,
    // mas SEM redirecionar (não usamos init_point no frontend)
    const preference = new Preference(mp)
    const { id: preferenceId } = await preference.create({
      body: {
        items: [{
          id: livroPrincipal.id,
          title: livroPrincipal.titulo,
          description: `${livroPrincipal.autor} – Estado: ${livroPrincipal.estado}`,
          quantity: quantidadeDesejada,
          unit_price: Number(livroPrincipal.preco_final),
          currency_id: 'BRL',
        }],
        payer: { email: user.email || '' },
        external_reference: order.id,
        notification_url: `${appUrl}/api/pagamento/webhook`,
      },
    })

    await supabase
      .from('orders')
      .update({ mp_preference_id: preferenceId })
      .eq('id', order.id)

    return NextResponse.json({
      order_id: order.id,
      preference_id: preferenceId,
      valor_total: valorTotal,
      public_key: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
      payer_email: user.email,
    })
  } catch (error) {
    console.error('[API /pagamento POST]', error)
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}
