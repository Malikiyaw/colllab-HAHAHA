"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
      secondary: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
      destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      outline: "text-zinc-900 border border-zinc-300 dark:text-zinc-100 dark:border-zinc-700",
      success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    }

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }