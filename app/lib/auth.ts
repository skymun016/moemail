import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { createDb, Db } from "./db"
import { accounts, users, roles, userRoles } from "./schema"
import { eq } from "drizzle-orm"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { Permission, hasPermission, ROLES, Role } from "./permissions"
import CredentialsProvider from "next-auth/providers/credentials"
import { hashPassword, comparePassword } from "@/lib/utils"
import { authSchema } from "@/lib/validation"
import { generateAvatarUrl } from "./avatar"
import { getUserId } from "./apiKey"

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [ROLES.EMPEROR]: "皇帝（网站所有者）",
  [ROLES.DUKE]: "公爵（超级用户）",
  [ROLES.KNIGHT]: "骑士（高级用户）",
  [ROLES.CIVILIAN]: "平民（普通用户）",
}

const getDefaultRole = async (): Promise<Role> => {
  const defaultRole = await getRequestContext().env.SITE_CONFIG.get("DEFAULT_ROLE")

  if (
    defaultRole === ROLES.DUKE ||
    defaultRole === ROLES.KNIGHT ||
    defaultRole === ROLES.CIVILIAN
  ) {
    return defaultRole as Role
  }
  
  return ROLES.CIVILIAN
}

export async function findOrCreateRole(db: Db, roleName: Role) {
  let role = await db.query.roles.findFirst({
    where: eq(roles.name, roleName),
  })

  if (!role) {
    const [newRole] = await db.insert(roles)
      .values({
        name: roleName,
        description: ROLE_DESCRIPTIONS[roleName],
      })
      .returning()
    role = newRole
  }

  return role
}

export async function assignRoleToUser(db: Db, userId: string, roleId: string) {
  await db.delete(userRoles)
    .where(eq(userRoles.userId, userId))

  await db.insert(userRoles)
    .values({
      userId,
      roleId,
    })
}

export async function getUserRole(userId: string) {
  const db = createDb()
  const userRoleRecords = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, userId),
    with: { role: true },
  })
  return userRoleRecords[0].role.name
}

export async function checkPermission(permission: Permission) {
  try {
    const userId = await getUserId()

    if (!userId) return false

    // 添加重试机制
    let retries = 3
    while (retries > 0) {
      try {
        const db = createDb()
        const userRoleRecords = await db.query.userRoles.findMany({
          where: eq(userRoles.userId, userId),
          with: { role: true },
        })

        const userRoleNames = userRoleRecords.map(ur => ur.role.name)
        return hasPermission(userRoleNames as Role[], permission)
      } catch (dbError) {
        retries--
        console.error(`Database query failed, retries left: ${retries}`, dbError)

        if (retries === 0) {
          throw dbError
        }

        // 等待一小段时间后重试
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return false
  } catch (error) {
    console.error('Permission check failed:', error)
    return false
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth(() => ({
  secret: process.env.AUTH_SECRET,
  adapter: DrizzleAdapter(createDb(), {
    usersTable: users,
    accountsTable: accounts,
  }),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "用户名", type: "text", placeholder: "请输入用户名" },
        password: { label: "密码", type: "password", placeholder: "请输入密码" },
      },
      async authorize(credentials) {
        if (!credentials) {
          throw new Error("请输入用户名和密码")
        }

        const { username, password } = credentials

        try {
          authSchema.parse({ username, password })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          throw new Error("输入格式不正确")
        }

        const db = createDb()

        const user = await db.query.users.findFirst({
          where: eq(users.username, username as string),
        })

        if (!user) {
          throw new Error("用户名或密码错误")
        }

        // 检查是否是直接登录令牌
        if (password && password.startsWith('DIRECT_LOGIN_')) {
          console.log('Direct login token detected:', { username, password, userId: user.id })

          // 这是直接登录令牌，验证令牌格式和时效性
          const tokenParts = password.replace('DIRECT_LOGIN_', '').split('_')
          console.log('Token parts:', tokenParts)

          if (tokenParts.length >= 2) {
            const tokenUserId = tokenParts[0]
            const timestamp = parseInt(tokenParts[1])

            console.log('Token validation:', {
              tokenUserId,
              actualUserId: user.id,
              userIdMatch: tokenUserId === user.id,
              timestamp,
              isValidTimestamp: !isNaN(timestamp)
            })

            // 验证用户ID匹配和时间戳（10分钟内有效）
            if (tokenUserId === user.id && timestamp && !isNaN(timestamp)) {
              const now = Date.now()
              const timeDiff = now - timestamp
              console.log('Time validation:', { now, timestamp, timeDiff, valid: timeDiff < 10 * 60 * 1000 })

              if (timeDiff < 10 * 60 * 1000) { // 10分钟内有效
                console.log('Direct login token validation successful')
                return {
                  ...user,
                  password: undefined,
                }
              }
            }
          }
          console.log('Direct login token validation failed')
          throw new Error("直接登录令牌无效或已过期")
        }

        // 正常密码验证

        const isValid = await comparePassword(password as string, user.password as string)
        if (!isValid) {
          throw new Error("用户名或密码错误")
        }

        return {
          ...user,
          password: undefined,
        }
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (!user.id) return

      try {
        const db = createDb()
        const existingRole = await db.query.userRoles.findFirst({
          where: eq(userRoles.userId, user.id),
        })

        if (existingRole) return

        const defaultRole = await getDefaultRole()
        const role = await findOrCreateRole(db, defaultRole)
        await assignRoleToUser(db, user.id, role.id)
      } catch (error) {
        console.error('Error assigning role:', error)
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name || user.username
        token.username = user.username
        token.image = user.image || generateAvatarUrl(token.name as string)
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.username = token.username as string
        session.user.image = token.image as string

        const db = createDb()
        let userRoleRecords = await db.query.userRoles.findMany({
          where: eq(userRoles.userId, session.user.id),
          with: { role: true },
        })
  
        if (!userRoleRecords.length) {
          const defaultRole = await getDefaultRole()
          const role = await findOrCreateRole(db, defaultRole)
          await assignRoleToUser(db, session.user.id, role.id)
          userRoleRecords = [{
            userId: session.user.id,
            roleId: role.id,
            createdAt: new Date(),
            role: role
          }]
        }
  
        session.user.roles = userRoleRecords.map(ur => ({
          name: ur.role.name,
        }))
      }

      return session
    },
  },
  session: {
    strategy: "jwt",
  },
}))

export async function register(username: string, password: string) {
  const db = createDb()
  
  const existing = await db.query.users.findFirst({
    where: eq(users.username, username)
  })

  if (existing) {
    throw new Error("用户名已存在")
  }

  const hashedPassword = await hashPassword(password)
  
  const [user] = await db.insert(users)
    .values({
      username,
      password: hashedPassword,
    })
    .returning()

  return user
}
