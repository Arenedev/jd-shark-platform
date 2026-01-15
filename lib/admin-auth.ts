// Admin session helper functions

export function checkAdminSession(): boolean {
  if (typeof window === "undefined") return false

  try {
    const sessionStr = localStorage.getItem("jdshark_admin_session")
    if (!sessionStr) return false

    const session = JSON.parse(sessionStr)
    if (!session.authenticated) return false

    // Check if session expired
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem("jdshark_admin_session")
      return false
    }

    return true
  } catch {
    return false
  }
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("jdshark_admin_session")
}

export function redirectToAdminLogin(): void {
  if (typeof window === "undefined") return
  window.location.href = "/admin/login"
}
