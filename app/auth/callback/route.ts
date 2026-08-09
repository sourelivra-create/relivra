import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /auth/callback
// O Google redireciona pra cá depois do usuário aprovar o login, com
// um "code" na URL. Trocamos esse code pela sessão real do Supabase
// (que grava o cookie), e só então mandamos pra rota que o usuário
// queria acessar originalmente.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/painel'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  // Sem code, ou trocou e deu erro — volta pro login com aviso
  return NextResponse.redirect(`${origin}/login?erro=oauth`)
}
