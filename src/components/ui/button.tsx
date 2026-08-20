"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "primary" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    
    const variants = {
      default: "bg-orange-600 text-white hover:bg-orange-700 focus-visible:ring-orange-600",
      primary: "bg-orange-600 text-white hover:bg-orange-700 focus-visible:ring-orange-600",
      destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
      outline: "border border-zinc-400 bg-transparent hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:hover:bg-zinc-800",
      secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus-visible:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
      ghost: "hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
      link: "text-orange-600 underline-offset-4 hover:underline focus-visible:ring-orange-600",
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-8 text-base",
      icon: "h-10 w-10",
    }

    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }