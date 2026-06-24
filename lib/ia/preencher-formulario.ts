import { GoogleGenAI } from '@google/genai'

// IMPORTANTE: o SDK @google/genai, se encontrar QUALQUER variável de
// ambiente chamada GOOGLE_API_KEY (mesmo vazia/indefinida em outro
// contexto), pode tentar autenticar via Application Default
// Credentials do Google Cloud em vez de usar a API key simples —
// isso gera o erro "Could not load the default credentials" mesmo
// com GEMINI_API_KEY configurada corretamente. Para evitar isso,
// removemos explicitamente essa variável antes de inicializar o
// client, garantindo que só a API key simples seja usada.
delete process.env.GOOGLE_API_KEY

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const MODELO_GEMINI = 'gemini-2.5-flash'

export interface PreenchimentoAutomaticoLivro {
  titulo: string
  autor: string
  categoria: string
  edicao: string
  estado: 'OTIMO' | 'BOM' | 'REGULAR' | 'RUIM'
  nota: number
  detalhes: string
  preco_novo: number
  preco_usado: number
  preco_sugerido: number
  preco_venda_rapida: number
  preco_maximo: number
  descricao: string
  probabilidade_venda: 'Alta' | 'Média' | 'Baixa'
  justificativa: string
  falhou: boolean
}

const PROMPT_ANALISE_COMPLETA = `Você é um especialista em avaliação e precificação de livros usados para revenda online no Brasil.

Vou te enviar imagens de um livro (capa, contracapa, lombada e páginas internas).

Sua tarefa é fazer uma análise COMPLETA e PROFISSIONAL, combinando:
1. Análise visual detalhada do livro
2. Pesquisa de mercado (preço novo e usado)
3. Estratégia de precificação para venda online

ETAPA 1 — IDENTIFICAÇÃO
Identifique título, autor, categoria, edição/versão. Se não estiver explícito, estime com base nas imagens.

ETAPA 2 — ANÁLISE VISUAL (SEJA CRÍTICO)
Analise minuciosamente: estado da capa (riscos, amassados, desgaste), lombada (quebras, marcas de uso), páginas (amareladas, manchas, grifos, dobras), marcas de uso geral.
Classifique o estado como OTIMO, BOM, REGULAR ou RUIM, com nota de 0 a 10.
Escreva detalhes críticos, como um comprador exigente analisaria.

ETAPA 3 — PESQUISA DE MERCADO
Estime preço novo e usado em R$, baseado no mercado brasileiro de sebos, Shopee, Mercado Livre.
Livros novos costumam girar entre R$40 e R$100+. Usados comuns entre R$10 e R$35, dependendo do estado.

ETAPA 4 — PRECIFICAÇÃO INTELIGENTE
Defina preço sugerido, preço para vender rápido (mais competitivo) e preço máximo (testando margem maior).
Regras: nunca abaixo de R$8. Priorize preços psicológicos (9.90, 14.90, 19.90). Estado ruim = preço agressivo. Livro popular = pode subir. Difícil de vender = priorizar giro.

ETAPA 5 — DESCRIÇÃO
Crie uma descrição clara, honesta, atrativa, focada em conversão.
IMPORTANTE: a descrição deve conter APENAS o texto de venda em si — não repita título, autor, edição, estado de conservação ou nota, pois esses campos já são exibidos separadamente no formulário. Não use formatação Markdown (sem **, #, etc), apenas texto corrido em parágrafos.

CLASSIFICAÇÃO FINAL
Probabilidade de venda: Alta, Média ou Baixa, com justificativa baseada em estado + demanda + preço.

Retorne APENAS um JSON válido, sem texto antes ou depois, no formato exato:
{
  "titulo": "",
  "autor": "",
  "categoria": "",
  "edicao": "",
  "estado": "OTIMO|BOM|REGULAR|RUIM",
  "nota": 0,
  "detalhes": "",
  "preco_novo": 0,
  "preco_usado": 0,
  "preco_sugerido": 0,
  "preco_venda_rapida": 0,
  "preco_maximo": 0,
  "descricao": "",
  "probabilidade_venda": "Alta|Média|Baixa",
  "justificativa": ""
}

Regras: nunca escrever texto fora do JSON, não usar "R$" nos números, usar apenas números, seguir o mercado brasileiro, não inventar valores irreais.`

export async function preencherFormularioComIA(
  fotos: { base64: string; mimeType: string }[]
): Promise<PreenchimentoAutomaticoLivro> {
  const FALLBACK_VAZIO: PreenchimentoAutomaticoLivro = {
    titulo: '', autor: '', categoria: '', edicao: '',
    estado: 'BOM', nota: 5, detalhes: '',
    preco_novo: 0, preco_usado: 0,
    preco_sugerido: 0, preco_venda_rapida: 0, preco_maximo: 0,
    descricao: '',
    probabilidade_venda: 'Média', justificativa: '',
    falhou: true,
  }

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const partesImagem = fotos.map(f => ({
        inlineData: { data: f.base64, mimeType: f.mimeType },
      }))

      const response = await ai.models.generateContent({
        model: MODELO_GEMINI,
        contents: [PROMPT_ANALISE_COMPLETA, ...partesImagem],
      })

      const texto = response.text || ''
      const jsonLimpo = texto.replace(/```json\n?|\n?```/g, '').trim()
      const analise = JSON.parse(jsonLimpo)

      return {
        titulo: String(analise.titulo || ''),
        autor: String(analise.autor || ''),
        categoria: String(analise.categoria || ''),
        edicao: String(analise.edicao || ''),
        estado: validarEstado(analise.estado),
        nota: clamp(Number(analise.nota) || 5, 0, 10),
        detalhes: String(analise.detalhes || ''),
        preco_novo: Number(analise.preco_novo) || 0,
        preco_usado: Number(analise.preco_usado) || 0,
        preco_sugerido: Math.max(8, Number(analise.preco_sugerido) || 8),
        preco_venda_rapida: Math.max(8, Number(analise.preco_venda_rapida) || 8),
        preco_maximo: Math.max(8, Number(analise.preco_maximo) || 8),
        descricao: String(analise.descricao || ''),
        probabilidade_venda: validarProbabilidade(analise.probabilidade_venda),
        justificativa: String(analise.justificativa || ''),
        falhou: false,
      }
    } catch (err) {
      console.error(`[Gemini análise] tentativa ${tentativa} falhou:`, err)
      if (tentativa === 2) return FALLBACK_VAZIO
    }
  }

  return FALLBACK_VAZIO
}

function validarEstado(estado: string): 'OTIMO' | 'BOM' | 'REGULAR' | 'RUIM' {
  const validos = ['OTIMO', 'BOM', 'REGULAR', 'RUIM']
  const normalizado = String(estado || '').toUpperCase()
  return validos.includes(normalizado) ? (normalizado as any) : 'BOM'
}

function validarProbabilidade(prob: string): 'Alta' | 'Média' | 'Baixa' {
  const validos = ['Alta', 'Média', 'Baixa']
  return validos.includes(prob) ? (prob as any) : 'Média'
}

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor))
}
