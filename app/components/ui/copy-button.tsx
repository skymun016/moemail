"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface CopyButtonProps {
  text: string
  onSuccess?: () => void
  onError?: (error: Error) => void
  className?: string
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "ghost"
  children?: React.ReactNode
}

export function CopyButton({ 
  text, 
  onSuccess, 
  onError, 
  className = "",
  size = "sm",
  variant = "ghost",
  children 
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const copyToClipboard = async () => {
    try {
      // 方法1: 现代浏览器的 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        onSuccess?.()
        return
      }

      // 方法2: 备选方案 - 创建临时文本区域
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      
      // 确保元素获得焦点
      textArea.focus()
      textArea.select()
      
      // 尝试复制
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        onSuccess?.()
      } else {
        throw new Error('execCommand copy failed')
      }
      
    } catch (error) {
      console.error('Copy failed:', error)
      onError?.(error as Error)
      
      // 最后的备选方案：显示文本让用户手动复制
      toast({
        title: "无法自动复制",
        description: (
          <div className="space-y-2">
            <p>请手动复制以下内容：</p>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs break-all select-all">
              {text}
            </div>
          </div>
        ),
        duration: 8000,
      })
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={copyToClipboard}
      className={className}
      disabled={copied}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-1" />
          {children || "已复制"}
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 mr-1" />
          {children || "复制"}
        </>
      )}
    </Button>
  )
}
