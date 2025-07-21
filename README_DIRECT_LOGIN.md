# 直接登录链接功能实现

## 功能概述

管理员可以在用户管理页面为任何用户生成一个直接登录链接，用户点击链接后可以直接进入邮箱页面，无需手动输入用户名和密码。

## 技术实现

### 1. 数据库扩展

新增 `temp_access_tokens` 表：
- `id`: 主键
- `user_id`: 目标用户ID
- `token`: 唯一令牌
- `expires_at`: 过期时间（15分钟）
- `used_at`: 使用时间（一次性使用）
- `created_by`: 创建者（管理员）ID
- `ip_address`: 生成时的IP地址
- `user_agent`: 生成时的用户代理

### 2. API接口

#### 生成登录链接
- **路径**: `POST /api/admin/users/generate-login-link`
- **权限**: 需要皇帝权限
- **参数**: `{ userId: string }`
- **返回**: `{ loginUrl: string, expiresAt: string, expiresIn: string, username: string }`

#### 直接登录处理
- **路径**: `GET /auth/direct-login?token=xxx`
- **功能**: 验证令牌并重定向到自动登录页面

#### 自动登录处理
- **路径**: `GET /auth/auto-signin?userId=xxx&username=xxx&timestamp=xxx`
- **功能**: 创建临时令牌并处理自动登录

#### 令牌登录
- **路径**: `GET /auth/token-signin?token=xxx`
- **功能**: 使用临时令牌通过NextAuth进行登录

### 3. 用户界面

#### 用户管理面板
在每个用户行添加了一个绿色的链接图标按钮：
- 点击后自动生成15分钟有效的登录链接
- 自动复制到剪贴板
- 显示成功提示

### 4. 安全特性

1. **时效性**: 令牌15分钟后自动过期
2. **一次性使用**: 令牌使用后立即失效
3. **权限验证**: 只有皇帝可以生成链接
4. **用户状态检查**: 验证目标用户状态是否有效
5. **IP和User-Agent记录**: 记录生成时的环境信息
6. **防重放攻击**: 时间戳验证防止链接被重复使用

## 使用流程

### 管理员操作
1. 登录皇帝账号
2. 进入个人中心 → 用户管理
3. 找到目标用户，点击绿色链接图标
4. 系统自动生成链接并复制到剪贴板
5. 将链接发送给用户（通过QQ、微信等）

### 用户操作
1. 收到管理员发送的登录链接
2. 在浏览器中打开链接
3. 系统自动验证并登录
4. 直接跳转到邮箱页面

## 错误处理

系统会处理以下错误情况：
- 无效的令牌格式
- 令牌已过期
- 令牌已使用
- 用户状态异常（禁用、暂停、过期）
- 网络错误

所有错误都会显示友好的错误页面，并提供返回首页的选项。

## 部署说明

### 1. 数据库迁移
```bash
# 运行数据库迁移
pnpm db:migrate-local  # 本地环境
pnpm db:migrate        # 生产环境
```

### 2. 环境变量
确保设置了以下环境变量：
- `AUTH_SECRET`: NextAuth密钥
- `NEXTAUTH_URL`: 网站基础URL

### 3. 文件清单
新增文件：
- `app/api/admin/users/generate-login-link/route.ts`
- `app/api/auth/direct-login/route.ts`
- `app/api/auth/auto-signin/route.ts`
- `app/api/auth/token-signin/route.ts`
- `app/auth/direct-login/page.tsx`
- `app/auth/auto-signin/page.tsx`
- `app/auth/token-signin/page.tsx`
- `app/auth/error/page.tsx`
- `app/components/auth/direct-login-handler.tsx`
- `app/components/auth/auto-signin-handler.tsx`
- `app/components/auth/token-signin-handler.tsx`
- `app/components/auth/auth-error-handler.tsx`
- `drizzle/0008_add_temp_access_tokens.sql`

修改文件：
- `app/lib/schema.ts`: 添加临时访问令牌表
- `app/lib/auth.ts`: 支持临时密码登录
- `app/components/admin/user-management-panel.tsx`: 添加生成链接按钮

## 测试验证

1. **功能测试**
   - 管理员生成链接
   - 用户使用链接登录
   - 链接过期测试
   - 链接重复使用测试

2. **安全测试**
   - 无效令牌测试
   - 权限验证测试
   - 用户状态验证测试

3. **用户体验测试**
   - 移动端兼容性
   - 错误提示友好性
   - 加载速度测试
