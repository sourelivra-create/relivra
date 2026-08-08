import { createAdminClient } from '@/lib/supabase/server'
import UsuarioCard from './UsuarioCard'

export default async function UsuariosPage() {
  const admin = createAdminClient()

  const { data: perfis } = await admin
    .from('profiles')
    .select('id, nome, rating, saldo, created_at, is_admin')
    .order('created_at', { ascending: false })

  const { data: authData } = await admin.auth.admin.listUsers()
  const emailPorId = new Map((authData?.users || []).map(u => [u.id, u.email || '']))

  const usuarios = (perfis || []).map(p => ({
    ...p,
    email: emailPorId.get(p.id) || '',
  }))

  return (
    <div>
      <h2 className="font-display font-bold text-xl mb-4">Usuários</h2>

      {!usuarios.length ? (
        <p className="text-gray-400 text-center py-12">Nenhum usuário cadastrado ainda</p>
      ) : (
        <div className="space-y-2">
          {usuarios.map(u => (
            <UsuarioCard key={u.id} usuario={u} />
          ))}
        </div>
      )}
    </div>
  )
}
