import { NextResponse } from "next/server"
import { auth, assignRoleToUser, findOrCreateRole } from "@/lib/auth"
import { createDb } from "@/lib/db"
import { users, roles } from "@/lib/schema"
import { eq, desc, like, or, sql } from "drizzle-orm"
import { hashPassword } from "@/lib/utils"
import { PERMISSIONS, ROLES, Role } from "@/lib/permissions"
import { checkPermission } from "@/lib/auth"
import { generateEmailsForUser } from "@/lib/auto-email-generator"
import { z } from "zod"

export const runtime = "edge"

// 创建用户的请求体验证
const createUserSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符").max(20, "用户名最多20个字符"),
  password: z.string().min(6, "密码至少6个字符"),
  role: z.enum([ROLES.DUKE, ROLES.KNIGHT, ROLES.CIVILIAN]),
  maxEmails: z.number().min(1, "邮箱数量至少为1").max(100, "邮箱数量最多为100"),
  email: z.string().email("邮箱格式不正确").optional(),
  expiryTime: z.number().optional(), // 有效期时间（毫秒）
  status: z.enum(['active', 'expired', 'disabled', 'suspended']).optional(), // 用户状态
})

// 获取用户列表
export async function GET(request: Request) {
  // 检查权限 - 只有皇帝可以管理用户
  const hasPermission = await checkPermission(PERMISSIONS.PROMOTE_USER)
  if (!hasPermission) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const search = searchParams.get('search') || ''
  const roleFilter = searchParams.get('role') || ''

  try {
    const db = createDb()
    const offset = (page - 1) * limit

    // 构建查询条件
    const conditions = []
    
    if (search) {
      conditions.push(
        or(
          like(users.username, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.name, `%${search}%`)
        )
      )
    }

    // 获取用户列表
    const userList = await db.query.users.findMany({
      where: conditions.length > 0 ? sql`${conditions.join(' AND ')}` : undefined,
      columns: {
        id: true,
        username: true,
        email: true,
        name: true,
        maxEmails: true,
        isAdminCreated: true,
        createdBy: true,
        // 明确包含新增的字段
        expiresAt: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      with: {
        userRoles: {
          with: {
            role: true
          }
        }
      },
      orderBy: desc(users.id),
      limit,
      offset
    })

    // 获取总数
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions.length > 0 ? sql`${conditions.join(' AND ')}` : undefined)
    
    const total = Number(totalResult[0].count)

    // 格式化返回数据
    const formattedUsers = userList.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      maxEmails: user.maxEmails,
      isAdminCreated: user.isAdminCreated,
      createdBy: user.createdBy,
      role: user.userRoles[0]?.role.name || ROLES.CIVILIAN,
      // 包含新增的用户期限管理字段
      expiresAt: user.expiresAt,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt
    }))

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: "获取用户列表失败" },
      { status: 500 }
    )
  }
}

// 创建新用户
export async function POST(request: Request) {
  // 检查权限 - 只有皇帝可以创建用户
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
    const validatedData = createUserSchema.parse(body)
    const { username, password, role, maxEmails, email, expiryTime, status } = validatedData

    const db = createDb()

    // 检查用户名是否已存在
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username)
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 409 }
      )
    }

    // 检查邮箱是否已存在（如果提供了邮箱）
    if (email) {
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, email)
      })

      if (existingEmail) {
        return NextResponse.json(
          { error: "邮箱已存在" },
          { status: 409 }
        )
      }
    }

    // 创建用户
    const hashedPassword = await hashPassword(password)
    // 计算过期时间
    const now = new Date()
    let expiresAt: Date | null = null
    if (expiryTime && expiryTime > 0) {
      expiresAt = new Date(now.getTime() + expiryTime)
    }

    const [newUser] = await db.insert(users)
      .values({
        username,
        password: hashedPassword,
        email: email || null,
        maxEmails,
        createdBy: session.user.id,
        isAdminCreated: true,
        expiresAt: expiresAt ? expiresAt.getTime() : null,
        status: status || 'active',
        createdAt: now.getTime(),
      })
      .returning()

    // 分配角色
    const userRole = await findOrCreateRole(db, role)
    await assignRoleToUser(db, newUser.id, userRole.id)

    // 自动生成邮箱
    const emailGenerationResult = await generateEmailsForUser({
      userId: newUser.id,
      username: newUser.username!,
      maxEmails,
    })

    if (!emailGenerationResult.success) {
      console.error('Failed to generate emails for user:', emailGenerationResult.errors)
      // 注意：即使邮箱生成失败，用户创建仍然成功
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        maxEmails: newUser.maxEmails,
        role,
        isAdminCreated: true
      },
      emailGeneration: {
        success: emailGenerationResult.success,
        generatedCount: emailGenerationResult.generatedCount,
        errors: emailGenerationResult.errors
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Failed to create user:', error)
    return NextResponse.json(
      { error: "创建用户失败" },
      { status: 500 }
    )
  }
}
