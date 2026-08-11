'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/95 border-green-600/80'
      case 'error':
        return 'bg-red-900/95 border-red-600/80'
      case 'warning':
        return 'bg-yellow-900/95 border-yellow-600/80'
      case 'info':
        return 'bg-blue-900/95 border-blue-600/80'
    }
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 rounded-lg border shadow-xl backdrop-blur-sm ${getBgColor()} animate-toast-in`}
      role="alert"
    >
      {getIcon()}
      <p className="text-white text-sm font-medium flex-1 min-w-0 leading-snug break-words">{message}</p>
      <button
        onClick={onClose}
        className="text-slate-300 hover:text-white transition-colors shrink-0 mt-0.5"
        aria-label="Lukk"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || toasts.length === 0) return null

  return createPortal(
    <>
      <style>{`
        @keyframes toastIn {
          from {
            transform: translateX(1.25rem);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-toast-in {
          animation: toastIn 0.25s ease-out;
        }
      `}</style>
      <div
        className="fixed z-[200] flex flex-col gap-3 pointer-events-none
          top-20 right-3 left-3
          sm:left-auto sm:top-24 sm:right-6 sm:w-[min(100vw-3rem,28rem)]"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => onRemove(toast.id)}
            />
          </div>
        ))}
      </div>
    </>,
    document.body
  )
}
