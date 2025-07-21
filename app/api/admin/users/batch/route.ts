import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"
import { batchSetUserExpiry, setUserStatus } from "@/lib/user-status"
import { BATCH_USER_ACTIONS, BatchUserAction, USER_STATUS, UserStatus } from "@/types/user"
import { z } from "zod"

export const runtime = "edge"

// 批量操作请求体验证
const batchUserSchema = z.object({
  userIds: z.array(z.string().uuid("无效的用户ID")).min(1, "至少选择一个用户"),
  action: z.enum([
    BATCH_USER_ACTIONS.EXTEND,
    BATCH_USER_ACTIONS.SET_EXPIRY,
    BATCH_USER_ACTIONS.DISABLE,
    BATCH_USER_ACTIONS.ENABLE,
    BATCH_USER_ACTIONS.SUSPEND,
  ]),
  expiryTime: z.number().min(0, "有效期不能为负数").optional(),
  reason: z.string().max(200, "原因不能超过200个字符").optional(),
})

// 批量用户操作
export async function POST(request: Request) {
  // 检查权限 - 只有皇帝可以批量管理用户
  const hasPermission = await checkPermission(PERMISSIONS.MANAGE_USERS)
  if (!hasPermission) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validatedData = batchUserSchema.parse(body)
    const { userIds, action, expiryTime, reason } = validatedData

    let result: { success: boolean; updatedCount?: number; error?: string }

    switch (action) {
      case BATCH_USER_ACTIONS.EXTEND:
      case BATCH_USER_ACTIONS.SET_EXPIRY:
        if (expiryTime === undefined) {
          return NextResponse.json(
            { error: "延期或设置有效期操作需要提供有效期时间" },
            { status: 400 }
          )
        }
        
        result = await batchSetUserExpiry(userIds, expiryTime, session.user.id)
        break

      case BATCH_USER_ACTIONS.DISABLE:
        result = await batchSetUserStatus(userIds, USER_STATUS.DISABLED, session.user.id)
        break

      case BATCH_USER_ACTIONS.ENABLE:
        result = await batchSetUserStatus(userIds, USER_STATUS.ACTIVE, session.user.id)
        break

      case BATCH_USER_ACTIONS.SUSPEND:
        result = await batchSetUserStatus(userIds, USER_STATUS.SUSPENDED, session.user.id)
        break

      default:
        return NextResponse.json(
          { error: "不支持的操作类型" },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "批量操作失败" },
        { status: 500 }
      )
    }

    // 记录操作日志（可选，后续实现）
    // await logBatchUserOperation({
    //   operatorId: session.user.id,
    //   action,
    //   userIds,
    //   expiryTime,
    //   reason,
    //   updatedCount: result.updatedCount
    // })

    return NextResponse.json({
      success: true,
      message: `成功${getActionName(action)} ${result.updatedCount || userIds.length} 个用户`,
      updatedCount: result.updatedCount || userIds.length
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Failed to batch update users:', error)
    return NextResponse.json(
      { error: "批量操作失败" },
      { status: 500 }
    )
  }
}

// 批量设置用户状态的辅助函数
async function batchSetUserStatus(
  userIds: string[], 
  status: UserStatus, 
  operatorId: string
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    const results = await Promise.all(
      userIds.map(userId => setUserStatus(userId, status, operatorId))
    )

    const successCount = results.filter(r => r.success).length
    const hasErrors = results.some(r => !r.success)

    if (hasErrors && successCount === 0) {
      return {
        success: false,
        updatedCount: 0,
        error: "所有用户状态更新失败"
      }
    }

    return {
      success: true,
      updatedCount: successCount,
      error: hasErrors ? `部分用户更新失败，成功更新 ${successCount} 个用户` : undefined
    }

  } catch (error) {
    console.error('Failed to batch set user status:', error)
    return {
      success: false,
      updatedCount: 0,
      error: "批量设置用户状态失败"
    }
  }
}

// 获取操作名称的辅助函数
function getActionName(action: BatchUserAction): string {
  const actionNames = {
    [BATCH_USER_ACTIONS.EXTEND]: "延期",
    [BATCH_USER_ACTIONS.SET_EXPIRY]: "设置有效期",
    [BATCH_USER_ACTIONS.DISABLE]: "禁用",
    [BATCH_USER_ACTIONS.ENABLE]: "启用",
    [BATCH_USER_ACTIONS.SUSPEND]: "暂停",
  }
  return actionNames[action] || "操作"
}
