// 用户状态检查和管理功能

import { createDb } from "./db"
import { users } from "./schema"
import { eq } from "drizzle-orm"
import { USER_STATUS, UserStatus, UserStatusResult, UserStatusDisplay } from "@/types/user"

/**
 * 检查用户状态和有效期
 * @param userId 用户ID
 * @returns 用户状态检查结果
 */
export async function checkUserStatus(userId: string): Promise<UserStatusResult> {
  try {
    const db = createDb()
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        status: true,
        expiresAt: true,
      }
    })

    if (!user) {
      return { 
        isValid: false, 
        reason: "用户不存在" 
      }
    }

    const currentStatus = user.status as UserStatus || USER_STATUS.ACTIVE
    const now = new Date()

    // 检查用户状态
    switch (currentStatus) {
      case USER_STATUS.DISABLED:
        return { 
          isValid: false, 
          reason: "账户已被管理员禁用，请联系管理员",
          status: currentStatus
        }

      case USER_STATUS.SUSPENDED:
        return { 
          isValid: false, 
          reason: "账户已被暂停使用，请联系管理员",
          status: currentStatus
        }

      case USER_STATUS.EXPIRED:
        return { 
          isValid: false, 
          reason: "账户已过期，请联系管理员续期",
          status: currentStatus,
          expiresAt: user.expiresAt || undefined
        }
    }

    // 检查有效期（仅当状态为 active 时）
    if (user.expiresAt && now > user.expiresAt) {
      // 自动更新状态为过期
      try {
        await db.update(users)
          .set({
            status: USER_STATUS.EXPIRED,
            lastLoginAt: now // 更新最后登录时间
          })
          .where(eq(users.id, userId))
      } catch (error) {
        // 如果 lastLoginAt 字段不存在，只更新状态
        await db.update(users)
          .set({ status: USER_STATUS.EXPIRED })
          .where(eq(users.id, userId))
      }

      return { 
        isValid: false, 
        reason: "账户已过期，请联系管理员续期",
        expiresAt: user.expiresAt,
        status: USER_STATUS.EXPIRED
      }
    }

    // 计算剩余天数
    let daysRemaining: number | undefined
    if (user.expiresAt) {
      const timeDiff = user.expiresAt.getTime() - now.getTime()
      daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
    }

    // 更新最后登录时间（如果字段存在）
    try {
      await db.update(users)
        .set({ lastLoginAt: now })
        .where(eq(users.id, userId))
    } catch (error) {
      // 忽略字段不存在的错误，向后兼容
      console.log('Note: lastLoginAt field not available yet')
    }

    return { 
      isValid: true,
      expiresAt: user.expiresAt || undefined,
      status: currentStatus,
      daysRemaining
    }

  } catch (error) {
    console.error('Failed to check user status:', error)
    return { 
      isValid: false, 
      reason: "系统错误，请稍后重试" 
    }
  }
}

/**
 * 获取用户状态显示信息
 * @param userId 用户ID
 * @returns 用户状态显示信息
 */
export async function getUserStatusDisplay(userId: string): Promise<UserStatusDisplay | null> {
  try {
    const db = createDb()
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        status: true,
        expiresAt: true,
      }
    })

    if (!user) return null

    const status = user.status as UserStatus || USER_STATUS.ACTIVE
    const now = new Date()
    
    let daysRemaining: number | undefined
    let isExpiringSoon = false

    if (user.expiresAt) {
      const timeDiff = user.expiresAt.getTime() - now.getTime()
      daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
      isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0
    }

    // 状态显示配置
    const statusConfig = {
      [USER_STATUS.ACTIVE]: {
        statusText: user.expiresAt ? 
          (daysRemaining && daysRemaining > 0 ? `剩余 ${daysRemaining} 天` : '正常') : 
          '永久有效',
        statusColor: isExpiringSoon ? 'text-orange-600' : 'text-green-600'
      },
      [USER_STATUS.EXPIRED]: {
        statusText: '已过期',
        statusColor: 'text-red-600'
      },
      [USER_STATUS.DISABLED]: {
        statusText: '已禁用',
        statusColor: 'text-gray-600'
      },
      [USER_STATUS.SUSPENDED]: {
        statusText: '已暂停',
        statusColor: 'text-yellow-600'
      }
    }

    const config = statusConfig[status] || statusConfig[USER_STATUS.ACTIVE]

    return {
      status,
      statusText: config.statusText,
      statusColor: config.statusColor,
      expiresAt: user.expiresAt || undefined,
      daysRemaining,
      isExpiringSoon
    }

  } catch (error) {
    console.error('Failed to get user status display:', error)
    return null
  }
}

/**
 * 设置用户有效期
 * @param userId 用户ID
 * @param expiryTime 有效期时间（毫秒），0表示永久
 * @param operatorId 操作者ID
 * @returns 操作结果
 */
export async function setUserExpiry(
  userId: string, 
  expiryTime: number, 
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createDb()
    
    const now = new Date()
    const expiresAt = expiryTime === 0 
      ? null // 永久有效
      : new Date(now.getTime() + expiryTime)

    await db.update(users)
      .set({ 
        expiresAt,
        status: USER_STATUS.ACTIVE, // 设置有效期时自动激活用户
      })
      .where(eq(users.id, userId))

    return { success: true }

  } catch (error) {
    console.error('Failed to set user expiry:', error)
    return { 
      success: false, 
      error: "设置用户有效期失败" 
    }
  }
}

/**
 * 设置用户状态
 * @param userId 用户ID
 * @param status 新状态
 * @param operatorId 操作者ID
 * @returns 操作结果
 */
export async function setUserStatus(
  userId: string, 
  status: UserStatus, 
  operatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = createDb()
    
    await db.update(users)
      .set({ status })
      .where(eq(users.id, userId))

    return { success: true }

  } catch (error) {
    console.error('Failed to set user status:', error)
    return { 
      success: false, 
      error: "设置用户状态失败" 
    }
  }
}

/**
 * 批量设置用户有效期
 * @param userIds 用户ID列表
 * @param expiryTime 有效期时间（毫秒），0表示永久
 * @param operatorId 操作者ID
 * @returns 操作结果
 */
export async function batchSetUserExpiry(
  userIds: string[], 
  expiryTime: number, 
  operatorId: string
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    const db = createDb()
    
    const now = new Date()
    const expiresAt = expiryTime === 0 
      ? null 
      : new Date(now.getTime() + expiryTime)

    const results = await Promise.all(
      userIds.map(userId => 
        db.update(users)
          .set({ 
            expiresAt,
            status: USER_STATUS.ACTIVE,
          })
          .where(eq(users.id, userId))
      )
    )

    return { 
      success: true, 
      updatedCount: results.length 
    }

  } catch (error) {
    console.error('Failed to batch set user expiry:', error)
    return { 
      success: false, 
      updatedCount: 0,
      error: "批量设置用户有效期失败" 
    }
  }
}
