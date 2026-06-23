import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/pedidos/confirmar-recebimento
// Chamado pelo COMPRADOR após receber o livro presencialmente.
// Move a(s) entrada(s) do ledger financeiro de PENDENTE para
// DISPONIVEL, liberando o valor para repasse ao vendedor.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { order_id, vendedor_id, foto_url, nota, comentario } = await request.json()

    if (!order_id || !foto_url || !nota) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Confirma que essa order pertence ao usuário logado (só o
    // comprador real pode confirmar o próprio pedido)
    const { data: order } = await supabase
      .from('orders')
      .select('id, comprador_id, status')
      .eq('id', order_id)
      .eq('comprador_id', user.id)
      .single()

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })

    // Usa admin client para escrever no ledger (RLS bloqueia escrita
    // direta de usuários comuns, por segurança)
    const admin = createAdminClient()

    // Move todas as entradas PENDENTES desse pedido para DISPONIVEL
    const { data: entradasAtualizadas, error: erroUpdate } = await admin
      .from('ledger_financeiro')
      .update({
        status: 'DISPONIVEL',
        confirmado_em: new Date().toISOString(),
        foto_confirmacao_url: foto_url,
      })
      .eq('order_id', order_id)
      .eq('status', 'PENDENTE')
      .select()

    if (erroUpdate) {
      console.error('[Confirmar recebimento]', erroUpdate)
      return NextResponse.json({ error: 'Erro ao liberar pagamento' }, { status: 500 })
    }

    if (!entradasAtualizadas?.length) {
      return NextResponse.json(
        { error: 'Nenhuma entrada pendente encontrada para esse pedido' },
        { status: 400 }
      )
    }

    // Registra a avaliação do vendedor (se a tabela/sistema de
    // avaliações já existir — usa o rating simples do profile por ora)
    if (vendedor_id) {
      const { data: vendedor } = await admin
        .from('profiles')
        .select('rating')
        .eq('id', vendedor_id)
        .single()

      if (vendedor) {
        // Média simples entre o rating atual e a nova nota — uma
        // melhoria futura seria guardar todas as notas individualmente
        const novaMedia = Number(((Number(vendedor.rating) + nota) / 2).toFixed(1))
        await admin
          .from('profiles')
          .update({ rating: novaMedia })
          .eq('id', vendedor_id)
      }
    }

    // Atualiza o status do pedido para ENTREGUE
    await admin
      .from('orders')
      .update({ status: 'ENTREGUE' })
      .eq('id', order_id)

    return NextResponse.json({
      ok: true,
      entradas_liberadas: entradasAtualizadas.length,
    })
  } catch (error) {
    console.error('[API /pedidos/confirmar-recebimento]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
