import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/trocas – Criar proposta de troca
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { receptor_id, livros_solicitante, livros_receptor, mensagem } = body

    if (!receptor_id || !livros_solicitante?.length || !livros_receptor?.length) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    if (receptor_id === user.id) {
      return NextResponse.json({ error: 'Não pode propor troca consigo mesmo' }, { status: 400 })
    }

    // Verificar que livros do solicitante pertencem a ele e aceitam troca
    const { data: livrosOferecidos, error: errLivros } = await supabase
      .from('books')
      .select('id, preco, nota_estado, destino, vendedor_id, vendido, aceita_troca')
      .in('id', livros_solicitante)

    if (errLivros || !livrosOferecidos) {
      return NextResponse.json({ error: 'Erro ao verificar livros' }, { status: 500 })
    }

    const livrosInvalidos = livrosOferecidos.filter(
      l => l.vendedor_id !== user.id || l.vendido || !l.aceita_troca
    )
    if (livrosInvalidos.length > 0) {
      return NextResponse.json({ error: 'Um ou mais livros são inválidos para troca' }, { status: 400 })
    }

    // Verificar que livros do receptor pertencem a ele e aceitam troca
    const { data: livrosDesejados } = await supabase
      .from('books')
      .select('id, preco, nota_estado, destino, vendedor_id, vendido, aceita_troca')
      .in('id', livros_receptor)

    const livrosReceptorInvalidos = (livrosDesejados || []).filter(
      l => l.vendedor_id !== receptor_id || l.vendido || !l.aceita_troca
    )
    if (livrosReceptorInvalidos.length > 0) {
      return NextResponse.json({ error: 'Livros do receptor inválidos para troca' }, { status: 400 })
    }

    // Calcular valores totais em R$ — continua sendo calculado sempre,
    // mesmo quando a troca envolve doação (fica no registro, só não
    // é o valor "principal" mostrado na tela nesse caso)
    const valorSolicitante = livrosOferecidos.reduce((acc, l) => acc + Number(l.preco), 0)
    const valorReceptor = (livrosDesejados || []).reduce((acc, l) => acc + Number(l.preco), 0)

    // Troca por doação: entra nessa modalidade quando pelo menos um
    // item do lado RECEPTOR é destino=DOACAO. O lado ofertado pode
    // ser qualquer livro (doação ou não) — só o lado recebido que
    // precisa ter doação pra ativar a comparação por nota em vez de R$.
    const envolveDoacao = (livrosDesejados || []).some(l => l.destino === 'DOACAO')

    const avaliacaoTotalSolicitante = envolveDoacao
      ? livrosOferecidos.reduce((acc, l) => acc + Number(l.nota_estado || 0), 0)
      : null
    const avaliacaoTotalReceptor = envolveDoacao
      ? (livrosDesejados || []).reduce((acc, l) => acc + Number(l.nota_estado || 0), 0)
      : null

    // Criar troca
    const { data: troca, error: errTroca } = await supabase
      .from('trocas')
      .insert({
        solicitante_id: user.id,
        receptor_id,
        valor_total_solicitante: valorSolicitante,
        valor_total_receptor: valorReceptor,
        envolve_doacao: envolveDoacao,
        avaliacao_total_solicitante: avaliacaoTotalSolicitante,
        avaliacao_total_receptor: avaliacaoTotalReceptor,
        mensagem: mensagem || null,
      })
      .select()
      .single()

    if (errTroca || !troca) {
      return NextResponse.json({ error: 'Erro ao criar troca' }, { status: 500 })
    }

    // Inserir itens da troca
    const itens = [
      ...livros_solicitante.map((bookId: string) => ({
        troca_id: troca.id,
        book_id: bookId,
        dono_id: user.id,
      })),
      ...livros_receptor.map((bookId: string) => ({
        troca_id: troca.id,
        book_id: bookId,
        dono_id: receptor_id,
      })),
    ]

    const { error: errItens } = await supabase.from('troca_itens').insert(itens)
    if (errItens) {
      // Rollback: deletar troca criada
      await supabase.from('trocas').delete().eq('id', troca.id)
      return NextResponse.json({ error: 'Erro ao salvar itens da troca' }, { status: 500 })
    }

    return NextResponse.json({ troca }, { status: 201 })
  } catch (error) {
    console.error('[API /trocas POST]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH /api/trocas – Aceitar ou recusar troca
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { troca_id, acao } = body // acao: 'ACEITAR' | 'RECUSAR'

    if (!troca_id || !['ACEITAR', 'RECUSAR'].includes(acao)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Buscar troca
    const { data: troca } = await supabase
      .from('trocas')
      .select('*, troca_itens(*)')
      .eq('id', troca_id)
      .single()

    if (!troca) return NextResponse.json({ error: 'Troca não encontrada' }, { status: 404 })
    if (troca.receptor_id !== user.id) {
      return NextResponse.json({ error: 'Apenas o receptor pode responder' }, { status: 403 })
    }
    if (troca.status !== 'PENDENTE') {
      return NextResponse.json({ error: 'Troca não está pendente' }, { status: 400 })
    }

    if (acao === 'RECUSAR') {
      await supabase.from('trocas').update({ status: 'RECUSADA' }).eq('id', troca_id)
      return NextResponse.json({ status: 'RECUSADA' })
    }

    // ACEITAR: reservar os livros de forma atômica antes de criar
    // a order. Livro de doação pode ter sido reservado nesse meio
    // tempo por um pedido de doação aceito (o outro caminho que
    // compete pelo mesmo livro) — a RPC garante que isso não passa
    // batido silenciosamente.
    const bookIds = (troca.troca_itens as Array<{ book_id: string }>).map(i => i.book_id)

    const { error: reservaError } = await supabase.rpc('reservar_livros', {
      p_book_ids: bookIds,
    })

    if (reservaError) {
      // A RPC levanta exceção quando algum livro já foi reservado
      // por outra negociação (troca aceita antes, ou pedido de
      // doação aceito antes) — nesse caso a troca não pode avançar.
      await supabase.from('trocas').update({ status: 'RECUSADA' }).eq('id', troca_id)
      return NextResponse.json(
        { error: 'Um ou mais livros desta troca já foram reservados por outra negociação. A troca foi cancelada.' },
        { status: 409 }
      )
    }

    const { data: order } = await supabase
      .from('orders')
      .insert({
        comprador_id: user.id,
        valor_total: troca.valor_total_receptor + troca.valor_total_solicitante,
        status: 'PAGO',
        tipo: 'TROCA',
      })
      .select()
      .single()

    await supabase.from('trocas').update({
      status: 'ACEITA',
      order_id: order?.id || null,
    }).eq('id', troca_id)

    return NextResponse.json({ status: 'ACEITA', order_id: order?.id })
  } catch (error) {
    console.error('[API /trocas PATCH]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
