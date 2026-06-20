import Anthropic from '@anthropic-ai/sdk'
import type { AnaliseIA, EstadoLivro } from '@/types/database.types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const PROMPT_ANALISE = `Você é um especialista em avaliação de livros usados.
Analise esta imagem de um livro e retorne um JSON com exatamente estes campos:

{
  "titulo": "título do livro",
  "autor": "nome do autor",
  "estado": "OTIMO" | "BOM" | "REGULAR" | "RUIM",
  "nota": número de 0 a 10,
  "descricao_estado": "descrição breve do estado de conservação",
  "incerto": true | false
}

Critérios de estado:
- OTIMO (8-10): Sem marcas visíveis, capa perfeita, páginas limpas
- BOM (6-7): Pequenos sinais de uso, sem danos significativos
- REGULAR (4-5): Marcas de uso visíveis, possíveis grifos ou orelhas
- RUIM (0-3): Danos visíveis, capa danificada, páginas rasgadas/manchadas

Se não conseguir identificar título ou autor com certeza, marque "incerto": true.
Retorne APENAS o JSON, sem texto adicional.`

export async function analisarLivroComIA(imagemBase64: string, mimeType: string): Promise<AnaliseIA> {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imagemBase64,
            },
          },
          {
            type: 'text',
            text: PROMPT_ANALISE,
          },
        ],
      },
    ],
  })

  const texto = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    // Remove possíveis marcações de código
    const jsonLimpo = texto.replace(/```json\n?|\n?```/g, '').trim()
    const analise = JSON.parse(jsonLimpo)

    return {
      titulo: analise.titulo || '',
      autor: analise.autor || '',
      estado: validarEstado(analise.estado),
      nota: Math.min(10, Math.max(0, Number(analise.nota) || 5)),
      descricao_estado: analise.descricao_estado || '',
      incerto: Boolean(analise.incerto),
    }
  } catch {
    // Fallback se JSON falhar
    return {
      titulo: '',
      autor: '',
      estado: 'BOM',
      nota: 5,
      descricao_estado: 'Não foi possível analisar automaticamente.',
      incerto: true,
    }
  }
}

function validarEstado(estado: string): EstadoLivro {
  const estados: EstadoLivro[] = ['OTIMO', 'BOM', 'REGULAR', 'RUIM']
  return estados.includes(estado as EstadoLivro) ? (estado as EstadoLivro) : 'BOM'
}
