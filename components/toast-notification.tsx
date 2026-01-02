"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

interface ToastProps {
  message: string
  type: "success" | "error" | "info" | "warning"
  duration?: number
  onClose: () => void
}

export function Toast({ message, type, duration = 4000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: "bg-green-100 border-green-300",
    error: "bg-red-100 border-red-300",
    info: "bg-blue-100 border-blue-300",
    warning: "bg-yellow-100 border-yellow-300",
  }[type]

  const textColor = {
    success: "text-green-800",
    error: "text-red-800",
    info: "text-blue-800",
    warning: "text-yellow-800",
  }[type]

  return (
    <div className={`fixed bottom-4 right-4 max-w-sm border ${bgColor} rounded-lg p-4 animate-slide-in-up`}>
      <div className="flex justify-between items-start gap-3">
        <p className={`text-sm font-medium ${textColor}`}>{message}</p>
        <button onClick={onClose} className={`${textColor} hover:opacity-75`}>
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: "success" | "error" | "info" | "warning" }>
  >([])

  const addToast = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return { toasts, addToast, removeToast }
}
