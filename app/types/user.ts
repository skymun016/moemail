// 用户状态和期限管理相关类型定义

export const USER_STATUS = {
  ACTIVE: 'active',      // 正常使用
  EXPIRED: 'expired',    // 已过期
  DISABLED: 'disabled',  // 管理员禁用
  SUSPENDED: 'suspended' // 暂停使用
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]

// 用户有效期模板
export interface ExpiryTemplate {
  label: string
  value: number // 毫秒数，0表示永久
  description?: string
}

export const USER_EXPIRY_TEMPLATES: ExpiryTemplate[] = [
  {
    label: '7天试用',
    value: 7 * 24 * 60 * 60 * 1000,
    description: '适合新用户试用'
  },
  {
    label: '1个月',
    value: 30 * 24 * 60 * 60 * 1000,
    description: '短期使用'
  },
  {
    label: '3个月',
    value: 90 * 24 * 60 * 60 * 1000,
    description: '季度订阅'
  },
  {
    label: '6个月',
    value: 180 * 24 * 60 * 60 * 1000,
    description: '半年订阅'
  },
  {
    label: '1年',
    value: 365 * 24 * 60 * 60 * 1000,
    description: '年度订阅'
  },
  {
    label: '自定义天数',
    value: -1, // 特殊值，表示需要手动输入
    description: '手动输入天数'
  },
  {
    label: '永久',
    value: 0,
    description: '永不过期'
  }
]

// 用户状态检查结果
export interface UserStatusResult {
  isValid: boolean
  reason?: string
  expiresAt?: Date
  status?: UserStatus
  daysRemaining?: number
}

// 用户状态显示信息
export interface UserStatusDisplay {
  status: UserStatus
  statusText: string
  statusColor: string
  expiresAt?: Date
  daysRemaining?: number
  isExpiringSoon: boolean // 7天内过期
}

// 批量用户操作类型
export const BATCH_USER_ACTIONS = {
  EXTEND: 'extend',           // 延期
  SET_EXPIRY: 'setExpiry',   // 设置有效期
  DISABLE: 'disable',         // 禁用
  ENABLE: 'enable',          // 启用
  SUSPEND: 'suspend',        // 暂停
} as const

export type BatchUserAction = typeof BATCH_USER_ACTIONS[keyof typeof BATCH_USER_ACTIONS]

// 批量操作请求
export interface BatchUserRequest {
  userIds: string[]
  action: BatchUserAction
  expiryTime?: number // 延期时间（毫秒）或新的有效期
  reason?: string     // 操作原因
}

// 用户统计信息
export interface UserStats {
  total: number
  active: number
  expired: number
  disabled: number
  suspended: number
  expiringSoon: number // 7天内过期
}

// 用户状态变更日志
export interface UserStatusLog {
  id: string
  userId: string
  operatorId: string
  action: string
  oldStatus?: UserStatus
  newStatus?: UserStatus
  oldExpiresAt?: Date
  newExpiresAt?: Date
  reason?: string
  createdAt: Date
}
