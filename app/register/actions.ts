'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export async function signup(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    redirect('/register?error=' + encodeURIComponent(error.message))
  }

  // Wenn E-Mail-Bestätigung in Supabase aktiv ist, gibt es hier noch keine Session.
  if (!data.session) {
    redirect(
      '/login?error=' +
        encodeURIComponent(
          'Bitte bestätige deine E-Mail-Adresse, bevor du dich anmeldest.'
        )
    )
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
