import { NextRequest, NextResponse } from 'next/server'
import { preencherFormularioComIA } from '@/lib/ia/preencher-formulario'
import { createClient } from '@/lib/supabase/server'

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_TAMANHO = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const formData = await request.formData()
    const arquivos = formData.getAll('fotos') as File[]

    if (!arquivos.length) {
      return NextResponse.json({ error: 'Envie pelo menos uma foto' }, { status: 400 })
    }

    const fotosProcessadas: { base64: string; mimeType: string }[] = []

    for (const arquivo of arquivos) {
      if (!TIPOS_ACEITOS.includes(arquivo.type)) {
        return NextResponse.json(
          { error: `Formato inválido: ${arquivo.type}. Use JPG, PNG ou WebP.` },
          { status: 400 }
        )
      }
      if (arquivo.size > MAX_TAMANHO) {
        return NextResponse.json({ error: 'Cada imagem deve ter no máximo 5MB' }, { status: 400 })
      }

      const buffer = await arquivo.arrayBuffer()
      fotosProcessadas.push({
        base64: Buffer.from(buffer).toString('base64'),
        mimeType: arquivo.type,
      })
    }

    const resultado = await preencherFormularioComIA(fotosProcessadas)

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('[API /ia/preencher-formulario]', error)
    return NextResponse.json(
      { error: 'Erro ao analisar as imagens', falhou: true },
      { status: 500 }
    )
  }
}
