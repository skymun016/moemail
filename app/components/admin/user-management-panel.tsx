"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Users, Plus, Edit, Trash2, Crown, Gem, Sword, User2, Mail, Clock, Ban, Pause, AlertTriangle, Link } from "lucide-react"
import { ROLES } from "@/lib/permissions"
import { LoginLinkDialog } from "./login-link-dialog"
import { USER_STATUS, USER_EXPIRY_TEMPLATES, UserStatus } from "@/types/user"
import { cn } from "@/lib/utils"
import { z } from "zod"

interface User {
  id: string
  username: string
  email?: string
  name?: string
  maxEmails?: number
  isAdminCreated: boolean
  role: string
  createdAt: string
  // 新增用户期限管理字段
  expiresAt?: number | string | null  // 时间戳（毫秒），可能是字符串或数字
  status?: UserStatus
  lastLoginAt?: number | string | null  // 时间戳（毫秒），可能是字符串或数字
  daysRemaining?: number
}

interface UserListResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const createUserSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符").max(20, "用户名最多20个字符"),
  password: z.string().min(6, "密码至少6个字符"),
  role: z.enum([ROLES.DUKE, ROLES.KNIGHT, ROLES.CIVILIAN]),
  maxEmails: z.number().min(1, "邮箱数量至少为1").max(100, "邮箱数量最多为100"),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
})

const roleIcons = {
  [ROLES.EMPEROR]: Crown,
  [ROLES.DUKE]: Gem,
  [ROLES.KNIGHT]: Sword,
  [ROLES.CIVILIAN]: User2,
}

const roleNames = {
  [ROLES.EMPEROR]: "皇帝",
  [ROLES.DUKE]: "公爵",
  [ROLES.KNIGHT]: "骑士",
  [ROLES.CIVILIAN]: "平民",
}

export function UserManagementPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // 用户状态显示辅助函数
  const getUserStatusDisplay = (user: User) => {
    const status = user.status || USER_STATUS.ACTIVE
    const now = new Date()



    // 计算剩余天数
    let daysRemaining: number | undefined
    let isExpiringSoon = false

    if (user.expiresAt) {
      // 直接解析日期字符串或时间戳
      const expiresAt = new Date(user.expiresAt)
      const timeDiff = expiresAt.getTime() - now.getTime()
      daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
      isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0



    }

    // 状态配置
    const statusConfig = {
      [USER_STATUS.ACTIVE]: {
        icon: user.expiresAt ? (isExpiringSoon ? AlertTriangle : Clock) : null,
        text: user.expiresAt ? (() => {
          const expiresAt = new Date(user.expiresAt)
          const formattedDate = expiresAt.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })

          if (daysRemaining !== undefined && daysRemaining > 0) {
            return `到期时间: ${formattedDate} (${daysRemaining}天后)`
          } else if (daysRemaining !== undefined && daysRemaining <= 0) {
            return `已过期 (${formattedDate})`
          } else {
            return `到期时间: ${formattedDate}`
          }
        })() : '永久有效',
        color: isExpiringSoon ? 'text-orange-500' : 'text-green-500'
      },
      [USER_STATUS.EXPIRED]: {
        icon: Ban,
        text: user.expiresAt ? (() => {
          const expiresAt = new Date(user.expiresAt)
          const formattedDate = expiresAt.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          return `已过期 (${formattedDate})`
        })() : '已过期',
        color: 'text-red-500'
      },
      [USER_STATUS.DISABLED]: {
        icon: Ban,
        text: '已禁用',
        color: 'text-gray-500'
      },
      [USER_STATUS.SUSPENDED]: {
        icon: Pause,
        text: '已暂停',
        color: 'text-yellow-500'
      }
    }

    const config = statusConfig[status] || statusConfig[USER_STATUS.ACTIVE]
    const IconComponent = config.icon

    return (
      <div className={cn("flex items-center gap-1", config.color)}>
        {IconComponent && <IconComponent className="w-3 h-3" />}
        <span>{config.text}</span>
      </div>
    )
  }
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  
  // 创建用户表单状态
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    role: ROLES.KNIGHT as string,
    maxEmails: 10,
    email: "",
    expiryTime: USER_EXPIRY_TEMPLATES[6].value, // 默认永久
    status: USER_STATUS.ACTIVE as UserStatus,
    customDays: 30, // 自定义天数，默认30天
  })

  // 编辑用户表单状态
  const [editForm, setEditForm] = useState({
    maxEmails: 10,
    role: ROLES.KNIGHT as string,
    expiryTime: USER_EXPIRY_TEMPLATES[6].value, // 默认永久
    status: USER_STATUS.ACTIVE as UserStatus,
    customDays: 30, // 自定义天数，默认30天
  })

  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [pagination.page])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users?page=${pagination.page}&limit=${pagination.limit}`)
      if (response.ok) {
        const data: UserListResponse = await response.json()
        setUsers(data.users)
        setPagination(data.pagination)
      } else {
        toast({
          title: "错误",
          description: "获取用户列表失败",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast({
        title: "错误",
        description: "获取用户列表失败",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      // 处理自定义天数
      let finalExpiryTime = createForm.expiryTime
      if (createForm.expiryTime === -1) {
        // 自定义天数：转换为毫秒
        finalExpiryTime = createForm.customDays * 24 * 60 * 60 * 1000
      }

      const requestData = {
        ...createForm,
        expiryTime: finalExpiryTime,
        email: createForm.email || undefined
      }

      const validatedData = createUserSchema.parse(requestData)

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedData)
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "成功",
          description: `用户 ${validatedData.username} 创建成功，已自动生成 ${result.emailGeneration.generatedCount} 个邮箱`,
        })
        setCreateDialogOpen(false)
        setCreateForm({
          username: "",
          password: "",
          role: ROLES.KNIGHT,
          maxEmails: 10,
          email: "",
          expiryTime: USER_EXPIRY_TEMPLATES[6].value, // 默认永久
          status: USER_STATUS.ACTIVE,
          customDays: 30,
        })
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          title: "创建失败",
          description: error.error || "创建用户失败",
          variant: "destructive"
        })
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "输入错误",
          description: error.errors[0].message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "创建失败",
          description: "创建用户失败",
          variant: "destructive"
        })
      }
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      // 处理自定义天数
      let finalExpiryTime = editForm.expiryTime
      if (editForm.expiryTime === -1) {
        // 自定义天数：转换为毫秒
        finalExpiryTime = editForm.customDays * 24 * 60 * 60 * 1000
      }

      const requestData = {
        ...editForm,
        expiryTime: finalExpiryTime
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "成功",
          description: result.message || "用户更新成功",
        })
        setEditDialogOpen(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          title: "更新失败",
          description: error.error || "更新用户失败",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "更新失败",
        description: "更新用户失败",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (user.role === ROLES.EMPEROR) {
      toast({
        title: "错误",
        description: "不能删除皇帝用户",
        variant: "destructive"
      })
      return
    }

    if (!confirm(`确定要删除用户 ${user.username} 吗？此操作不可恢复。`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast({
          title: "成功",
          description: "用户删除成功",
        })
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          title: "删除失败",
          description: error.error || "删除用户失败",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "删除用户失败",
        variant: "destructive"
      })
    }
  }



  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      maxEmails: user.maxEmails || 10,
      role: user.role,
      expiryTime: user.expiresAt ? 0 : USER_EXPIRY_TEMPLATES[6].value, // 如果有过期时间则设为永久，否则使用默认
      status: user.status || USER_STATUS.ACTIVE,
      customDays: 30, // 默认自定义天数
    })
    setEditDialogOpen(true)
  }

  return (
    <div className="bg-background rounded-lg border-2 border-primary/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">用户管理</h2>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              添加用户
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>创建新用户</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="输入用户名"
                />
              </div>
              <div>
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="输入密码"
                />
              </div>
              <div>
                <Label htmlFor="email">邮箱（可选）</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="输入邮箱地址"
                />
              </div>
              <div>
                <Label htmlFor="role">角色</Label>
                <Select value={createForm.role} onValueChange={(value) => setCreateForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROLES.DUKE}>公爵</SelectItem>
                    <SelectItem value={ROLES.KNIGHT}>骑士</SelectItem>
                    <SelectItem value={ROLES.CIVILIAN}>平民</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="maxEmails">邮箱数量</Label>
                <Input
                  id="maxEmails"
                  type="number"
                  min="1"
                  max="100"
                  value={createForm.maxEmails}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, maxEmails: parseInt(e.target.value) || 1 }))}
                />
              </div>

              {/* 用户有效期设置 */}
              <div>
                <Label>账户有效期</Label>
                <RadioGroup
                  value={createForm.expiryTime.toString()}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, expiryTime: parseInt(value) }))}
                  className="grid grid-cols-2 gap-2 mt-2"
                >
                  {USER_EXPIRY_TEMPLATES.map((template) => (
                    <div key={template.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={template.value.toString()} id={`create-expiry-${template.value}`} />
                      <Label htmlFor={`create-expiry-${template.value}`} className="text-sm cursor-pointer">
                        {template.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* 自定义天数输入框 */}
                {createForm.expiryTime === -1 && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Label htmlFor="createCustomDays" className="text-sm font-medium">
                      自定义天数
                    </Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        id="createCustomDays"
                        type="number"
                        min="1"
                        max="3650"
                        value={createForm.customDays}
                        onChange={(e) => setCreateForm(prev => ({
                          ...prev,
                          customDays: parseInt(e.target.value) || 1
                        }))}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">天</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        (1-3650天，约10年)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 用户状态设置 */}
              <div>
                <Label>账户状态</Label>
                <Select value={createForm.status} onValueChange={(value: UserStatus) => setCreateForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={USER_STATUS.ACTIVE}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        正常使用
                      </div>
                    </SelectItem>
                    <SelectItem value={USER_STATUS.DISABLED}>
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-red-500" />
                        禁用账户
                      </div>
                    </SelectItem>
                    <SelectItem value={USER_STATUS.SUSPENDED}>
                      <div className="flex items-center gap-2">
                        <Pause className="w-4 h-4 text-yellow-500" />
                        暂停使用
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateUser} className="w-full">
                创建用户
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 用户列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>加载用户列表...</span>
            </div>
          </div>
        ) : users.length > 0 ? (
          users.map((user, index) => {
            const RoleIcon = roleIcons[user.role as keyof typeof roleIcons] || User2
            const roleColor = user.role === ROLES.EMPEROR ? 'amber' :
                             user.role === ROLES.DUKE ? 'purple' :
                             user.role === ROLES.KNIGHT ? 'blue' : 'gray'

            return (
              <div
                key={user.id}
                className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200",
                      roleColor === 'amber' && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                      roleColor === 'purple' && "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
                      roleColor === 'blue' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                      roleColor === 'gray' && "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    )}>
                      <RoleIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {user.username}
                        </h3>
                        {user.role === ROLES.EMPEROR && (
                          <div className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
                            皇帝
                          </div>
                        )}
                        {user.isAdminCreated && (
                          <div className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                            系统创建
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            roleColor === 'amber' && "bg-amber-500",
                            roleColor === 'purple' && "bg-purple-500",
                            roleColor === 'blue' && "bg-blue-500",
                            roleColor === 'gray' && "bg-gray-500"
                          )}></div>
                          {roleNames[user.role as keyof typeof roleNames]}
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.maxEmails || 0} 个邮箱
                        </div>
                        {/* 用户状态显示 */}
                        {getUserStatusDisplay(user)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* 生成登录链接按钮 - 所有用户都可以生成 */}
                    <LoginLinkDialog user={user}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400"
                        title={`生成 ${user.username} 的直接登录链接`}
                      >
                        <Link className="w-4 h-4" />
                      </Button>
                    </LoginLinkDialog>

                    {user.role !== ROLES.EMPEROR && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <User2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">暂无用户</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              还没有创建任何用户，点击上方按钮创建第一个用户
            </p>
          </div>
        )}
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            上一页
          </Button>
          <span className="flex items-center px-3 text-sm">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑用户 {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editRole">角色</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.DUKE}>公爵</SelectItem>
                  <SelectItem value={ROLES.KNIGHT}>骑士</SelectItem>
                  <SelectItem value={ROLES.CIVILIAN}>平民</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editMaxEmails">邮箱数量</Label>
              <Input
                id="editMaxEmails"
                type="number"
                min="1"
                max="100"
                value={editForm.maxEmails}
                onChange={(e) => setEditForm(prev => ({ ...prev, maxEmails: parseInt(e.target.value) || 1 }))}
              />
            </div>

            {/* 用户有效期设置 */}
            <div>
              <Label>账户有效期</Label>
              <RadioGroup
                value={editForm.expiryTime.toString()}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, expiryTime: parseInt(value) }))}
                className="grid grid-cols-2 gap-2 mt-2"
              >
                {USER_EXPIRY_TEMPLATES.map((template) => (
                  <div key={template.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={template.value.toString()} id={`expiry-${template.value}`} />
                    <Label htmlFor={`expiry-${template.value}`} className="text-sm cursor-pointer">
                      {template.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {/* 自定义天数输入框 */}
              {editForm.expiryTime === -1 && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Label htmlFor="customDays" className="text-sm font-medium">
                    自定义天数
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="customDays"
                      type="number"
                      min="1"
                      max="3650"
                      value={editForm.customDays}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        customDays: parseInt(e.target.value) || 1
                      }))}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">天</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (1-3650天，约10年)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 用户状态设置 */}
            <div>
              <Label>账户状态</Label>
              <Select value={editForm.status} onValueChange={(value: UserStatus) => setEditForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={USER_STATUS.ACTIVE}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      正常使用
                    </div>
                  </SelectItem>
                  <SelectItem value={USER_STATUS.DISABLED}>
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-500" />
                      禁用账户
                    </div>
                  </SelectItem>
                  <SelectItem value={USER_STATUS.SUSPENDED}>
                    <div className="flex items-center gap-2">
                      <Pause className="w-4 h-4 text-yellow-500" />
                      暂停使用
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleEditUser} className="w-full">
              更新用户
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
