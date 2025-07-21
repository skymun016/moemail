import { Header } from "@/components/layout/header"
import { ThreeColumnLayout } from "@/components/emails/three-column-layout"
import { NoPermissionDialog } from "@/components/no-permission-dialog"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"

export const runtime = "edge"

export default async function MoePage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/")
  }

  const hasPermission = await checkPermission(PERMISSIONS.VIEW_EMAIL)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
      <div className="container mx-auto h-screen px-4 lg:px-6 max-w-[1800px]">
        <Header />
        <main className="h-full relative">
          {/* 背景装饰 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 h-full">
            <ThreeColumnLayout />
          </div>
          {!hasPermission && <NoPermissionDialog />}
        </main>
      </div>
    </div>
  )
} 