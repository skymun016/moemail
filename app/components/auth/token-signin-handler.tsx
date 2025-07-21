"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"

type SigninState = 'loading' | 'success' | 'error'

export function TokenSigninHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<SigninState>('loading')
  const [message, setMessage] = useState('正在处理登录...')
  const [username, setUsername] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const usernameParam = searchParams.get('username')

    if (!token || !usernameParam) {
      setState('error')
      setMessage('无效的登录参数')
      return
    }

    setUsername(decodeURIComponent(usernameParam))
    handleTokenSignin(token, decodeURIComponent(usernameParam))
  }, [searchParams])

  const handleTokenSignin = async (token: string, username: string) => {
    try {
      // 直接使用NextAuth的credentials provider进行登录
      const result = await signIn('credentials', {
        username: username,
        password: token, // 直接使用令牌作为密码
        redirect: false,
      })

      if (result?.error) {
        setState('error')
        setMessage('登录失败：' + result.error)
        return
      }

      setState('success')
      setMessage('登录成功，正在跳转到邮箱页面...')

      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        router.push('/moe')
      }, 1500)

    } catch (error) {
      console.error('Token signin error:', error)
      setState('error')
      setMessage('网络错误，请重试')
    }
  }

  const getIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />
      default:
        return null
    }
  }

  const getTitle = () => {
    switch (state) {
      case 'loading':
        return '正在登录...'
      case 'success':
        return '登录成功'
      case 'error':
        return '登录失败'
      default:
        return '处理中...'
    }
  }

  return (
    <Card className="w-full border-2 border-primary/20">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {getIcon()}
        </div>
        <CardTitle className="text-xl">
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          {message}
        </p>
        
        {username && state === 'success' && (
          <p className="text-sm text-gray-500">
            欢迎回来，{username}！
          </p>
        )}

        {state === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              请联系管理员重新生成登录链接
            </p>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="w-full"
            >
              返回首页
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
