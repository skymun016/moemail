export const ROLES = {
  EMPEROR: 'emperor',
  DUKE: 'duke',
  KNIGHT: 'knight',
  CIVILIAN: 'civilian',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  VIEW_EMAIL: 'view_email',           // 查看邮箱权限
  MANAGE_EMAIL: 'manage_email',       // 管理邮箱权限（创建、删除）
  MANAGE_WEBHOOK: 'manage_webhook',
  PROMOTE_USER: 'promote_user',
  MANAGE_CONFIG: 'manage_config',
  MANAGE_API_KEY: 'manage_api_key',
  MANAGE_USERS: 'manage_users',       // 用户管理权限
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.EMPEROR]: Object.values(PERMISSIONS),
  [ROLES.DUKE]: [
    PERMISSIONS.VIEW_EMAIL,
    PERMISSIONS.MANAGE_WEBHOOK,
    PERMISSIONS.MANAGE_API_KEY,
  ],
  [ROLES.KNIGHT]: [
    PERMISSIONS.VIEW_EMAIL,
    PERMISSIONS.MANAGE_WEBHOOK,
  ],
  [ROLES.CIVILIAN]: [
    PERMISSIONS.VIEW_EMAIL,  // 平民也可以查看邮箱
  ],
} as const;

export function hasPermission(userRoles: Role[], permission: Permission): boolean {
  return userRoles.some(role => ROLE_PERMISSIONS[role]?.includes(permission));
} 