"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Mail, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useThrottle } from "@/hooks/use-throttle"
import { EMAIL_CONFIG } from "@/config"
import { ROLES } from "@/lib/permissions"
import { useUserRole } from "@/hooks/use-user-role"
import { useConfig } from "@/hooks/use-config"

interface Email {
  id: string
  address: string
  createdAt: number
  expiresAt: number
}

interface UserInfo {
  expiresAt?: number | null
}

interface EmailListProps {
  onEmailSelect: (email: Email | null) => void
  selectedEmailId?: string
}

interface EmailResponse {
  emails: Email[]
  nextCursor: string | null
  total: number
}

export function EmailList({ onEmailSelect, selectedEmailId }: EmailListProps) {
  const { data: session } = useSession()
  const { config } = useConfig()
  const { role } = useUserRole()
  const [emails, setEmails] = useState<Email[]>([])
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/roles/users')
      if (response.ok) {
        const data = await response.json()
        setUserInfo({ expiresAt: data.expiresAt })
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error)
    }
  }

  const fetchEmails = async (cursor?: string) => {
    try {
      const url = new URL("/api/emails", window.location.origin)
      if (cursor) {
        url.searchParams.set('cursor', cursor)
      }
      const response = await fetch(url)
      const data = await response.json() as EmailResponse
      
      if (!cursor) {
        const newEmails = data.emails
        const oldEmails = emails

        const lastDuplicateIndex = newEmails.findIndex(
          newEmail => oldEmails.some(oldEmail => oldEmail.id === newEmail.id)
        )

        if (lastDuplicateIndex === -1) {
          setEmails(newEmails)
          setNextCursor(data.nextCursor)
          setTotal(data.total)
          return
        }
        const uniqueNewEmails = newEmails.slice(0, lastDuplicateIndex)
        setEmails([...uniqueNewEmails, ...oldEmails])
        setTotal(data.total)
        return
      }
      setEmails(prev => [...prev, ...data.emails])
      setNextCursor(data.nextCursor)
      setTotal(data.total)
    } catch (error) {
      console.error("Failed to fetch emails:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchEmails()
  }

  const handleScroll = useThrottle((e: React.UIEvent<HTMLDivElement>) => {
    if (loadingMore) return

    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget
    const threshold = clientHeight * 1.5
    const remainingScroll = scrollHeight - scrollTop

    if (remainingScroll <= threshold && nextCursor) {
      setLoadingMore(true)
      fetchEmails(nextCursor)
    }
  }, 200)

  useEffect(() => {
    if (session) {
      fetchEmails()
      fetchUserInfo()
    }
  }, [session])



  if (!session) return null

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                我的邮箱
              </span>
              {/* 显示账户到期时间 */}
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                (() => {
                  if (!userInfo?.expiresAt) {
                    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }

                  const expiresAt = new Date(userInfo.expiresAt)
                  const now = new Date()

                  if (expiresAt > now) {
                    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    return daysRemaining <= 7
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  } else {
                    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }
                })()
              )}>
                {(() => {
                  if (!userInfo?.expiresAt) {
                    return "永久有效"
                  }

                  const expiresAt = new Date(userInfo.expiresAt)
                  const now = new Date()

                  if (expiresAt > now) {
                    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    return `${daysRemaining}天后到期`
                  } else {
                    return "已过期"
                  }
                })()}
              </span>
            </div>
            {role === ROLES.EMPEROR && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  管理员
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8 hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all duration-200"
            >
              <RefreshCw className={cn("h-4 w-4 text-gray-600 dark:text-gray-300", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-3 scrollbar-thin" onScroll={handleScroll}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">加载中...</span>
              </div>
            </div>
          ) : emails.length > 0 ? (
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div
                  key={email.id}
                  className={cn(
                    "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                    "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
                    "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-0.5",
                    selectedEmailId === email.id && "ring-2 ring-blue-500 ring-opacity-50 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                  )}
                  onClick={() => onEmailSelect(email)}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <div className="flex-shrink-0">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200",
                      selectedEmailId === email.id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"
                    )}>
                      <Mail className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {email.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}
              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">加载更多...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">暂无邮箱</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {role === ROLES.EMPEROR ? "您可以在用户管理中为用户创建邮箱" : "请联系管理员为您分配邮箱"}
              </p>
            </div>
          )}
        </div>
      </div>


    </>
  )
} 