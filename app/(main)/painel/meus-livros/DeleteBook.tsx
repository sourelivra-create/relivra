'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DeleteBook({ bookId }: { bookId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja remover este livro?')) return

    setLoading(true)
    await supabase.from('books').delete().eq('id', bookId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="btn-ghost p-2 text-red-400">
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    </button>
  )
}
