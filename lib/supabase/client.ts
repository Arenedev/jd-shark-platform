import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
