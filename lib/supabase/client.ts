import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Key are required. Please check your environment variables.")
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    isSingleton: true,
    cookieOptions: {
      domain: undefined,
      path: "/",
      sameSite: "lax",
    },
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: "jdshark-auth-token",
    },
  })

  return client
}

export { createClient as createBrowserClient }
