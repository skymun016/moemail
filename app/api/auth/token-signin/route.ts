import { NextResponse } from "next/server"
import { createDb } from "@/lib/db"
import { tempAccessTokens, users } from "@/lib/schema"
import { eq, and, gt, isNull } from "drizzle-orm"
import { z } from "zod"
import { checkUserStatus } from "@/lib/user-status"
import { nanoid } from "nanoid"

export const runtime = "edge"

const tokenSigninSchema = z.object({
  token: z.string().min(1, "令牌不能为空"),
})

// 处理令牌登录
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token } = tokenSigninSchema.parse(body)

    const db = createDb()
    
    // 查找有效的令牌
    const tokenRecord = await db.query.tempAccessTokens.findFirst({
      where: and(
        eq(tempAccessTokens.token, token),
        gt(tempAccessTokens.expiresAt, new Date()),
        isNull(tempAccessTokens.usedAt)
      ),
      with: { 
        user: {
          columns: {
            id: true,
            username: true,
            password: true,
            status: true,
            expiresAt: true,
          }
        }
      }
    })

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "登录令牌无效、已过期或已使用" },
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

    // 标记令牌为已使用
    await db.update(tempAccessTokens)
      .set({ usedAt: new Date() })
      .where(eq(tempAccessTokens.id, tokenRecord.id))

    // 返回用户信息和临时令牌用于NextAuth登录
    const tempLoginToken = `TEMP_LOGIN_TOKEN_${tokenRecord.user.id}_${Date.now()}`

    return NextResponse.json({
      success: true,
      username: tokenRecord.user.username,
      tempPassword: tempLoginToken, // 使用特殊的临时令牌
      userId: tokenRecord.user.id,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Token signin error:", error)
    return NextResponse.json(
      { error: "令牌登录失败" },
      { status: 500 }
    )
  }
}
