import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: perfil } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!perfil?.is_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { vendedor_id, comprovante } = await request.json()
    if (!vendedor_id) {
      return NextResponse.json({ error: 'Vendedor obrigatório' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: entradas } = await admin
      .from('ledger_financeiro')
      .select('id, valor_liquido_vendedor')
      .eq('vendedor_id', vendedor_id)
      .eq('status', 'DISPONIVEL')

    if (!entradas?.length) {
      return NextResponse.json(
        { error: 'Nenhuma entrada disponível para esse vendedor' },
        { status: 400 }
      )
    }

    const valorTotal = entradas.reduce((acc, e) => acc + Number(e.valor_liquido_vendedor), 0)
    const idsEntradas = entradas.map(e => e.id)

    const { data: payout, error: erroPayout } = await admin
      .from('payouts')
      .insert({
        vendedor_id,
        valor_total: valorTotal,
        qtd_vendas: entradas.length,
        metodo: 'PIX_MANUAL',
        comprovante: comprovante || null,
        pago_por: user.id,
      })
      .select()
      .single()

    if (erroPayout || !payout) {
      console.error('[Criar payout]', erroPayout)
      return NextResponse.json({ error: 'Erro ao criar repasse' }, { status: 500 })
    }

    const { data: atualizadas, error: erroUpdate } = await admin
      .from('ledger_financeiro')
      .update({ status: 'PAGO', payout_id: payout.id })
      .in('id', idsEntradas)
      .eq('status', 'DISPONIVEL')
      .select()

    if (erroUpdate) {
      console.error('[Marcar pago]', erroUpdate)
      return NextResponse.json({ error: 'Erro ao confirmar repasse' }, { status: 500 })
    }

    if (atualizadas && atualizadas.length !== entradas.length) {
      const valorReal = atualizadas.reduce((acc, e) => acc + Number(e.valor_liquido_vendedor), 0)
      await admin
        .from('payouts')
        .update({ valor_total: valorReal, qtd_vendas: atualizadas.length })
        .eq('id', payout.id)
    }

    return NextResponse.json({
      ok: true,
      payout_id: payout.id,
      valor_pago: valorTotal,
      qtd_entradas: atualizadas?.length || 0,
    })
  } catch (error) {
    console.error('[API /master/pagar-vendedor]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
