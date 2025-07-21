import { createDb } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"

export const runtime = "edge"

// 获取当前用户信息
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 })
    }

    const db = createDb()
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        expiresAt: true,
      }
    })

    if (!user) {
      return Response.json({ error: "用户不存在" }, { status: 404 })
    }

    return Response.json({
      expiresAt: user.expiresAt,
    })

  } catch (error) {
    console.error('Failed to fetch user info:', error)
    return Response.json({ error: "获取用户信息失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const { searchText } = json as { searchText: string }

    if (!searchText) {
      return Response.json({ error: "请提供用户名或邮箱地址" }, { status: 400 })
    }

    const db = createDb()

    const user = await db.query.users.findFirst({
      where: searchText.includes('@') ? eq(users.email, searchText) : eq(users.username, searchText),
      with: {
        userRoles: {
          with: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return Response.json({ error: "未找到用户" }, { status: 404 })
    }

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.userRoles[0]?.role.name
      }
    })
  } catch (error) {
    console.error("Failed to find user:", error)
    return Response.json(
      { error: "查询用户失败" },
      { status: 500 }
    )
  }
} 