"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"

type SigninState = 'loading' | 'success' | 'error'

export function AutoSigninHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<SigninState>('loading')
  const [message, setMessage] = useState('正在自动登录...')
  const [username, setUsername] = useState('')

  useEffect(() => {
    const userId = searchParams.get('userId')
    const usernameParam = searchParams.get('username')
    const timestamp = searchParams.get('timestamp')
    
    if (!userId || !usernameParam || !timestamp) {
      setState('error')
      setMessage('无效的登录参数')
      return
    }

    // 检查时间戳，防止链接被重复使用（5分钟内有效）
    const now = Date.now()
    const linkTime = parseInt(timestamp)
    if (now - linkTime > 5 * 60 * 1000) {
      setState('error')
      setMessage('登录链接已过期')
      return
    }

    setUsername(decodeURIComponent(usernameParam))
    handleAutoSignin(userId, usernameParam)
  }, [searchParams])

  const handleAutoSignin = async (userId: string, username: string) => {
    try {
      // 获取自动登录令牌
      const response = await fetch('/api/auth/auto-signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          username: decodeURIComponent(username),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setState('error')
        setMessage(data.error || '自动登录失败')
        return
      }

      // 使用NextAuth的signIn方法进行登录
      console.log('Attempting signIn with:', { username: data.username, tempToken: data.tempToken })

      const result = await signIn('credentials', {
        username: data.username,
        password: data.tempToken, // 使用临时令牌
        redirect: false,
      })

      console.log('SignIn result:', result)

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
      console.error('Auto signin error:', error)
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
