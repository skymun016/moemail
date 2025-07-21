import { Suspense } from "react"
import { AutoSigninHandler } from "@/components/auth/auto-signin-handler"

export const runtime = "edge"

export default function AutoSigninPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <Suspense fallback={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">正在自动登录...</p>
          </div>
        }>
          <AutoSigninHandler />
        </Suspense>
      </div>
    </div>
  )
}
