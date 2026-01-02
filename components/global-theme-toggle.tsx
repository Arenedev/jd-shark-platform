"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function GlobalThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const currentTheme = theme === "system" ? systemTheme : theme

  const handleThemeChange = () => {
    const newTheme = currentTheme === "dark" ? "light" : "dark"
    setTheme(newTheme)
  }

  return (
    <div className="fixed top-4 left-4 md:top-4 md:right-4 md:left-auto z-[100]">
      <Button
        variant="outline"
        size="icon"
        onClick={handleThemeChange}
        className="w-10 h-10 rounded-full shadow-lg border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent/20 transition-all duration-300 hover:scale-110"
        aria-label="Toggle theme"
        title={currentTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {currentTheme === "dark" ? (
          <Sun className="h-5 w-5 text-yellow-500 animate-fade-in" />
        ) : (
          <Moon className="h-5 w-5 text-blue-500 animate-fade-in" />
        )}
      </Button>
    </div>
  )
}
