'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { entwerteZugangsTokens } from '@/lib/zugang-token'

export async function setPassword(formData: FormData) {
  const password = (formData.get('password') as string) ?? ''
  const passwordConfirm = (formData.get('passwordConfirm') as string) ?? ''

  if (password.length < 6) {
    redirect(
      '/auth/set-password?error=' +
        encodeURIComponent('Passwort muss mindestens 6 Zeichen lang sein.')
    )
  }
  if (password !== passwordConfirm) {
    redirect(
      '/auth/set-password?error=' +
        encodeURIComponent('Die Passwörter stimmen nicht überein.')
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      '/login?error=' +
        encodeURIComponent(
          'Sitzung abgelaufen. Bitte den Einladungslink erneut öffnen.'
        )
    )
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect('/auth/set-password?error=' + encodeURIComponent(error.message))
  }

  // Der Zugangslink aus der Willkommensmail hat seinen Zweck erfüllt und wird
  // entwertet — auch wenn seine 72 Stunden noch nicht abgelaufen sind.
  try {
    await entwerteZugangsTokens(createAdminClient(), user.id)
  } catch (e) {
    // Nicht kritisch: das Token läuft ohnehin von selbst ab.
    console.error('[set-password] Zugangstoken konnte nicht entwertet werden:', e)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
