import { supabase } from '@/lib/supabase'

export default function GoogleSignInButton() {
  const handleGoogleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'profile email'
      }
    })
  }
  
  return (
    <button onClick={handleGoogleSignIn} className="...">
      Sign in with Google
    </button>
  )
}