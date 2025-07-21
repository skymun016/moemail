import { NextResponse } from "next/server"
import { createDb } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { checkUserStatus } from "@/lib/user-status"

export const runtime = "edge"

const autoSigninSchema = z.object({
  userId: z.string().min(1, "用户ID不能为空"),
  username: z.string().min(1, "用户名不能为空"),
})

// 处理自动登录 - 返回用户信息用于前端处理
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, username } = autoSigninSchema.parse(body)

    const db = createDb()

    // 验证用户存在
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        username: true,
        name: true,
        email: true,
        image: true,
        status: true,
        expiresAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    // 验证用户名匹配
    if (user.username !== username) {
      return NextResponse.json(
        { error: "用户信息不匹配" },
        { status: 400 }
      )
    }

    // 检查用户状态
    const userStatus = await checkUserStatus(user.id)
    if (!userStatus.isValid) {
      return NextResponse.json(
        { error: userStatus.reason || "用户状态异常" },
        { status: 403 }
      )
    }

    // 返回用户信息，让前端使用NextAuth的signIn方法
    const tempToken = `DIRECT_LOGIN_${user.id}_${Date.now()}`
    console.log('Auto-signin creating temp token:', { username: user.username, tempToken })

    return NextResponse.json({
      success: true,
      username: user.username,
      userId: user.id,
      // 创建一个特殊的临时令牌用于前端登录
      tempToken,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Auto signin error:", error)
    return NextResponse.json(
      { error: "自动登录失败" },
      { status: 500 }
    )
  }
}
