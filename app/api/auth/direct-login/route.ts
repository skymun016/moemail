import { NextResponse } from "next/server"
import { createDb } from "@/lib/db"
import { tempAccessTokens, users } from "@/lib/schema"
import { eq, and, gt, isNull } from "drizzle-orm"
import { z } from "zod"
import { checkUserStatus } from "@/lib/user-status"

export const runtime = "edge"

const directLoginSchema = z.object({
  token: z.string().min(1, "令牌不能为空"),
})

// 处理直接登录请求
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token } = directLoginSchema.parse(body)

    const db = createDb()
    
    // 查找有效的令牌（移除一次性使用限制）
    const tokenRecord = await db.query.tempAccessTokens.findFirst({
      where: and(
        eq(tempAccessTokens.token, token),
        gt(tempAccessTokens.expiresAt, new Date())
        // 移除 isNull(tempAccessTokens.usedAt) 条件，允许重复使用
      ),
      with: { 
        user: {
          columns: {
            id: true,
            username: true,
            status: true,
            expiresAt: true,
          }
        }
      }
    })

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "登录链接无效或已过期" },
        { status: 410 }
      )
    }

    // 检查用户状态
    const userStatus = await checkUserStatus(tokenRecord.user.id)
    if (!userStatus.isValid) {
      return NextResponse.json(
        { error: userStatus.reason || "用户状态异常" },
        { status: 403 }
      )
    }

    // 不需要更新任何字段，允许重复使用
    // 如果将来需要跟踪使用情况，可以添加 lastUsedAt 字段

    // 返回用户信息，用于创建会话
    return NextResponse.json({
      success: true,
      username: tokenRecord.user.username,
      userId: tokenRecord.user.id,
      // 生成一个临时标识，用于后续的会话创建
      tempToken: `DIRECT_LOGIN_${tokenRecord.user.id}_${Date.now()}`,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Direct login error:", error)
    return NextResponse.json(
      { error: "登录处理失败" },
      { status: 500 }
    )
  }
}

// 处理GET请求（从URL直接访问）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  if (!token) {
    return NextResponse.redirect('/auth/error?error=InvalidToken')
  }

  try {
    const db = createDb()
    
    // 查找有效的令牌（移除一次性使用限制）
    const tokenRecord = await db.query.tempAccessTokens.findFirst({
      where: and(
        eq(tempAccessTokens.token, token),
        gt(tempAccessTokens.expiresAt, new Date())
        // 移除 isNull(tempAccessTokens.usedAt) 条件，允许重复使用
      ),
      with: { 
        user: {
          columns: {
            id: true,
            username: true,
            status: true,
            expiresAt: true,
          }
        }
      }
    })

    if (!tokenRecord) {
      return NextResponse.redirect('/auth/error?error=TokenExpiredOrInvalid')
    }

    // 检查用户状态
    const userStatus = await checkUserStatus(tokenRecord.user.id)
    if (!userStatus.isValid) {
      return NextResponse.redirect(`/auth/error?error=${encodeURIComponent(userStatus.reason || "用户状态异常")}`)
    }

    // 更新最后使用时间（但不标记为已使用，允许重复使用）
    // 这里可以选择不更新任何字段，或者添加 lastUsedAt 字段来跟踪使用情况

    // 重定向到特殊的登录处理页面，携带用户信息
    const loginUrl = `/auth/auto-signin?userId=${tokenRecord.user.id}&username=${encodeURIComponent(tokenRecord.user.username)}&timestamp=${Date.now()}`

    return NextResponse.redirect(loginUrl)

  } catch (error) {
    console.error("Direct login GET error:", error)
    return NextResponse.redirect('/auth/error?error=SystemError')
  }
}
