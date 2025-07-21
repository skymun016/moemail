"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Link, Loader2, Clock, Shield } from "lucide-react"
import { CopyButton } from "@/components/ui/copy-button"

interface User {
  id: string
  username: string
  role: string
  status?: string
}

interface LoginLinkDialogProps {
  user: User
  children: React.ReactNode
}

interface LoginLinkData {
  loginUrl: string
  expiresAt: string
  expiresIn: string
  username: string
  isReusable?: boolean
}

export function LoginLinkDialog({ user, children }: LoginLinkDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [linkData, setLinkData] = useState<LoginLinkData | null>(null)
  const { toast } = useToast()

  const generateLoginLink = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/generate-login-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (response.ok) {
        setLinkData(data)
        toast({
          title: "成功",
          description: `已为 ${user.username} 生成登录链接`,
        })
      } else {
        toast({
          title: "生成失败",
          description: data.error || "生成登录链接失败",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Generate login link error:', error)
      toast({
        title: "生成失败",
        description: "生成登录链接失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // 关闭对话框时清除数据
      setLinkData(null)
    }
  }

  const handleCopySuccess = () => {
    toast({
      title: "复制成功",
      description: `${user.username} 的登录链接已复制到剪贴板`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-green-600" />
            生成登录链接
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            为用户 <span className="font-medium text-gray-900 dark:text-gray-100">{user.username}</span> 生成直接登录链接
          </div>

          {!linkData ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">安全提示</p>
                  <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• 链接与用户账号同步过期</li>
                    <li>• 可重复使用，无次数限制</li>
                    <li>• 请通过安全渠道发送给用户</li>
                  </ul>
                </div>
              </div>

              <Button 
                onClick={generateLoginLink} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    生成登录链接
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">链接已生成，{linkData.expiresIn}内有效{linkData.isReusable ? '（可重复使用）' : ''}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginUrl">登录链接</Label>
                <div className="flex gap-2">
                  <Input
                    id="loginUrl"
                    value={linkData.loginUrl}
                    readOnly
                    className="text-xs"
                  />
                  <CopyButton
                    text={linkData.loginUrl}
                    onSuccess={handleCopySuccess}
                    variant="outline"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>• 过期时间: {new Date(linkData.expiresAt).toLocaleString()}</p>
                <p>• 可重复使用，无次数限制</p>
                <p>• 请通过安全渠道发送给用户</p>
              </div>

              <Button 
                onClick={() => setLinkData(null)} 
                variant="outline"
                className="w-full"
              >
                生成新链接
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
