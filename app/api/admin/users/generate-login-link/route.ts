import { NextResponse } from "next/server"
import { auth, checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"
import { createDb } from "@/lib/db"
import { tempAccessTokens, users } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { z } from "zod"

export const runtime = "edge"

const generateLinkSchema = z.object({
  userId: z.string().min(1, "用户ID不能为空"),
})

// 获取客户端IP地址
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return 'unknown'
}

// 管理员为用户生成直接登录链接
export async function POST(request: Request) {
  // 检查权限 - 只有皇帝可以生成登录链接
  const hasPermission = await checkPermission(PERMISSIONS.PROMOTE_USER)
  if (!hasPermission) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { userId } = generateLinkSchema.parse(body)

    const db = createDb()

    // 验证目标用户是否存在
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        username: true,
        status: true,
        expiresAt: true,
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    // 检查用户状态
    if (targetUser.status === 'disabled' || targetUser.status === 'suspended') {
      return NextResponse.json(
        { error: "该用户已被禁用或暂停，无法生成登录链接" },
        { status: 400 }
      )
    }

    // 检查用户是否过期
    if (targetUser.expiresAt && new Date() > targetUser.expiresAt) {
      return NextResponse.json(
        { error: "该用户已过期，无法生成登录链接" },
        { status: 400 }
      )
    }

    // 生成持久登录令牌
    const token = `tlt_${nanoid(32)}` // temp login token

    // 设置过期时间：如果用户有过期时间，使用用户的过期时间；否则设置为1年后
    let expiresAt: Date
    if (targetUser.expiresAt) {
      expiresAt = targetUser.expiresAt
    } else {
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年有效期
    }
    
    await db.insert(tempAccessTokens).values({
      userId: targetUser.id,
      token,
      expiresAt,
      createdBy: session.user.id,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    // 构建登录URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const loginUrl = `${baseUrl}/auth/direct-login?token=${token}`
    
    // 计算剩余有效期显示
    const now = new Date()
    const timeDiff = expiresAt.getTime() - now.getTime()
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

    let expiresInText: string
    if (targetUser.expiresAt) {
      if (daysRemaining > 365) {
        expiresInText = '长期有效'
      } else if (daysRemaining > 30) {
        expiresInText = `${Math.ceil(daysRemaining / 30)}个月`
      } else if (daysRemaining > 0) {
        expiresInText = `${daysRemaining}天`
      } else {
        expiresInText = '即将过期'
      }
    } else {
      expiresInText = '长期有效'
    }

    return NextResponse.json({
      loginUrl,
      expiresAt: expiresAt.toISOString(),
      expiresIn: expiresInText,
      username: targetUser.username,
      isReusable: true, // 标记为可重复使用
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Failed to generate login link:", error)
    return NextResponse.json(
      { error: "生成登录链接失败" },
      { status: 500 }
    )
  }
}
