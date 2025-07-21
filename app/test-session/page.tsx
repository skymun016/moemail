import { auth } from "@/lib/auth"

export const runtime = "edge"

export default async function TestSessionPage() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">会话测试页面</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">当前会话状态</h2>
          
          {session ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-green-700 font-medium">已登录</span>
              </div>
              
              <div className="bg-gray-50 rounded p-4">
                <h3 className="font-medium mb-2">用户信息：</h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="text-red-700 font-medium">未登录</span>
              </div>
              
              <p className="text-gray-600">
                没有检测到有效的会话
              </p>
            </div>
          )}
          
          <div className="mt-6 pt-4 border-t">
            <a 
              href="/" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              返回首页
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
