"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"

type LoginState = 'loading' | 'success' | 'error' | 'expired' | 'used'

export function DirectLoginHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<LoginState>('loading')
  const [message, setMessage] = useState('')
  const [username, setUsername] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setState('error')
      setMessage('无效的登录链接')
      return
    }

    handleDirectLogin(token)
  }, [searchParams])

  const handleDirectLogin = async (token: string) => {
    try {
      // 验证令牌并获取用户信息
      const response = await fetch('/api/auth/direct-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 410) {
          setState('expired')
          setMessage('登录链接已过期或已使用')
        } else {
          setState('error')
          setMessage(data.error || '登录失败')
        }
        return
      }

      // 使用NextAuth进行登录
      const result = await signIn('credentials', {
        username: data.username,
        password: data.tempToken, // 使用临时令牌
        redirect: false,
      })

      if (result?.error) {
        setState('error')
        setMessage('登录失败，请重试')
        return
      }

      setState('success')
      setUsername(data.username)
      setMessage('登录成功，正在跳转...')
      
      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        router.push('/moe')
      }, 1500)

    } catch (error) {
      console.error('Direct login error:', error)
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
      case 'expired':
      case 'used':
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
      case 'expired':
        return '链接已过期'
      case 'used':
        return '链接已使用'
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

        {(state === 'error' || state === 'expired' || state === 'used') && (
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
