import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createDb } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"

export const runtime = "edge"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      )
    }

    const db = createDb()
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        username: true,
        email: true,
        name: true,
        expiresAt: true,
        status: true,
        maxEmails: true,
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      expiresAt: user.expiresAt,
      status: user.status,
      maxEmails: user.maxEmails,
      createdAt: user.createdAt,
    })

  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return NextResponse.json(
      { error: "获取用户信息失败" },
      { status: 500 }
    )
  }
}
