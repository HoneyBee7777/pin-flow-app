'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export async function changePassword(formData: FormData) {
  const password = (formData.get('password') as string) ?? ''
  const passwordConfirm = (formData.get('passwordConfirm') as string) ?? ''

  if (password.length < 6) {
    redirect(
      '/dashboard/profil?error=' +
        encodeURIComponent('Passwort muss mindestens 6 Zeichen lang sein.')
    )
  }
  if (password !== passwordConfirm) {
    redirect(
      '/dashboard/profil?error=' +
        encodeURIComponent('Die Passwörter stimmen nicht überein.')
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect('/dashboard/profil?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard/profil?success=1')
}
