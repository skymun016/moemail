"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export function AuthErrorHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'InvalidToken':
        return '无效的登录链接'
      case 'TokenExpiredOrUsed':
      case 'TokenExpiredOrInvalid':
        return '登录链接已过期或无效'
      case 'SystemError':
        return '系统错误，请稍后重试'
      default:
        return decodeURIComponent(errorCode || '未知错误')
    }
  }

  const getErrorDescription = (errorCode: string | null) => {
    switch (errorCode) {
      case 'InvalidToken':
        return '您访问的登录链接格式不正确，请检查链接是否完整。'
      case 'TokenExpiredOrUsed':
      case 'TokenExpiredOrInvalid':
        return '登录链接已过期。链接的有效期与用户账号同步，请联系管理员检查账号状态。'
      case 'SystemError':
        return '服务器遇到了一些问题，请稍后再试或联系管理员。'
      default:
        return '请联系管理员获取帮助。'
    }
  }

  return (
    <Card className="w-full border-2 border-red-200 dark:border-red-800">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <CardTitle className="text-xl text-red-600 dark:text-red-400">
          登录失败
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="space-y-2">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {getErrorMessage(error)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {getErrorDescription(error)}
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Button 
            onClick={() => router.push('/')}
            className="w-full"
          >
            返回首页
          </Button>
          <p className="text-xs text-gray-500">
            如果问题持续存在，请联系管理员重新生成登录链接
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
