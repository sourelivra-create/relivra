import Anthropic from '@anthropic-ai/sdk'
import type { EstadoLivro } from '@/types/database.types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ============================================================
// Interruptor central: enquanto false, a avaliação da IA é
// totalmente OPCIONAL e não bloqueia a publicação do livro.
// Quando true, o livro só pode ser publicado depois que a IA
// avaliar o estado de conservação pelas fotos.
//
// Mudar aqui (ou via variável de ambiente) ativa/desativa a
// obrigatoriedade sem precisar tocar no resto do código.
// ============================================================
export const IA_AVALIACAO_OBRIGATORIA =
  process.env.IA_AVALIACAO_OBRIGATORIA === 'true'

export const MAX_TENTATIVAS_AVALIACAO_IA = 2

const PROMPT_AVALIACAO_ESTADO = `Você é um perito em avaliação de estado de conservação de livros usados.
Você vai receber 3 ou mais fotos do MESMO livro: capa, página interna, e contracapa/verso (possivelmente mais).

Sua tarefa é dar uma avaliação INDEPENDENTE e REALISTA do estado de conservação,
baseada apenas no que é visível nas fotos. Esta avaliação será mostrada ao lado
da avaliação que o próprio vendedor declarou, para dar mais transparência ao comprador.

Seja rigoroso e honesto — não infle a nota. Procure por:
- Manchas, amareladas ou rasgos nas páginas
- Danos na capa (dobras, rasgos, descoloração)
- Condição da lombada (solta, rachada)
- Anotações, grifos ou orelhas nas páginas

Retorne APENAS um JSON com este formato exato:
{
  "estado": "OTIMO" | "BOM" | "REGULAR" | "RUIM",
  "nota": número de 0 a 10,
  "descricao": "explicação breve e objetiva do que você observou nas fotos"
}

Critérios:
- OTIMO (8-10): Sem marcas visíveis, capa perfeita, páginas limpas
- BOM (6-7): Pequenos sinais de uso, sem danos significativos
- REGULAR (4-5): Marcas de uso visíveis, possíveis grifos ou orelhas
- RUIM (0-3): Danos visíveis, capa danificada, páginas rasgadas/manchadas

Retorne APENAS o JSON, sem texto adicional.`

interface FotoInput {
  base64: string
  mimeType: string
}

export interface AvaliacaoEstadoIA {
  estado: EstadoLivro
  nota: number
  descricao: string
}

/**
 * Avalia o estado de conservação de um livro a partir de suas fotos.
 * Essa é a ÚNICA responsabilidade da IA agora — não identifica título,
 * autor, categoria ou preço, que são sempre preenchidos manualmente
 * pelo vendedor no cadastro.
 */
export async function avaliarEstadoComIA(fotos: FotoInput[]): Promise<AvaliacaoEstadoIA> {
  if (fotos.length < 3) {
    throw new Error('São necessárias pelo menos 3 fotos para avaliação (capa, interna, verso)')
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', // modelo mais barato — suficiente para essa tarefa visual
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: [
          ...fotos.map(foto => ({
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: foto.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: foto.base64,
            },
          })),
          {
            type: 'text' as const,
            text: PROMPT_AVALIACAO_ESTADO,
          },
        ],
      },
    ],
  })

  const texto = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const jsonLimpo = texto.replace(/```json\n?|\n?```/g, '').trim()
    const resultado = JSON.parse(jsonLimpo)

    return {
      estado: validarEstado(resultado.estado),
      nota: Math.min(10, Math.max(0, Number(resultado.nota) || 5)),
      descricao: resultado.descricao || 'Avaliação concluída sem observações adicionais.',
    }
  } catch {
    throw new Error('Não foi possível interpretar a resposta da IA')
  }
}

function validarEstado(estado: string): EstadoLivro {
  const estados: EstadoLivro[] = ['OTIMO', 'BOM', 'REGULAR', 'RUIM']
  return estados.includes(estado as EstadoLivro) ? (estado as EstadoLivro) : 'BOM'
}
