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
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const { usuario_id, novo_email } = await request.json()
    if (!usuario_id || !novo_email) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin.auth.admin.updateUserById(usuario_id, {
      email: novo_email,
      email_confirm: true,
    })

    if (error) {
      console.error('[Editar email]', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API /master/usuarios/editar-email]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
