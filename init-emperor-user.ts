/**
 * 初始化皇帝用户脚本
 * 用于在本地测试环境中创建一个皇帝用户
 */

import { createDb } from './app/lib/db';
import { users, roles, userRoles } from './app/lib/schema';
import { hashPassword } from './app/lib/utils';
import { ROLES } from './app/lib/permissions';
import { eq } from 'drizzle-orm';

const EMPEROR_USER = {
  username: 'emperor',
  password: 'emperor123',
  email: 'emperor@moemail.app',
  name: 'Emperor Admin'
};

async function createEmperorUser() {
  console.log('🚀 开始创建皇帝用户...');
  
  try {
    const db = createDb();
    
    // 1. 检查用户是否已存在
    console.log('🔍 检查用户是否已存在...');
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, EMPEROR_USER.username)
    });
    
    if (existingUser) {
      console.log('⚠️  皇帝用户已存在:', existingUser.username);
      
      // 检查是否有皇帝角色
      const userRole = await db.query.userRoles.findFirst({
        where: eq(userRoles.userId, existingUser.id),
        with: {
          role: true
        }
      });
      
      if (userRole?.role.name === ROLES.EMPEROR) {
        console.log('✅ 用户已具有皇帝角色');
        console.log('👤 用户信息:', {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          name: existingUser.name
        });
        return existingUser;
      } else {
        console.log('🔄 为现有用户分配皇帝角色...');
        await assignEmperorRole(db, existingUser.id);
        return existingUser;
      }
    }
    
    // 2. 创建新用户
    console.log('👤 创建新的皇帝用户...');
    const hashedPassword = await hashPassword(EMPEROR_USER.password);
    
    const [newUser] = await db.insert(users)
      .values({
        username: EMPEROR_USER.username,
        password: hashedPassword,
        email: EMPEROR_USER.email,
        name: EMPEROR_USER.name,
        isAdminCreated: false, // 这是系统初始用户
      })
      .returning();
    
    console.log('✅ 用户创建成功:', newUser.username);
    
    // 3. 分配皇帝角色
    await assignEmperorRole(db, newUser.id);
    
    console.log('🎉 皇帝用户初始化完成!');
    console.log('📋 登录信息:');
    console.log(`   用户名: ${EMPEROR_USER.username}`);
    console.log(`   密码: ${EMPEROR_USER.password}`);
    console.log(`   邮箱: ${EMPEROR_USER.email}`);
    
    return newUser;
    
  } catch (error) {
    console.error('❌ 创建皇帝用户失败:', error);
    throw error;
  }
}

async function assignEmperorRole(db, userId) {
  console.log('👑 分配皇帝角色...');
  
  // 查找或创建皇帝角色
  let emperorRole = await db.query.roles.findFirst({
    where: eq(roles.name, ROLES.EMPEROR)
  });
  
  if (!emperorRole) {
    console.log('🔨 创建皇帝角色...');
    [emperorRole] = await db.insert(roles)
      .values({
        name: ROLES.EMPEROR,
        description: '网站所有者，拥有所有权限'
      })
      .returning();
  }
  
  // 检查是否已有角色分配
  const existingRole = await db.query.userRoles.findFirst({
    where: eq(userRoles.userId, userId)
  });
  
  if (existingRole) {
    // 更新现有角色
    await db.update(userRoles)
      .set({ roleId: emperorRole.id })
      .where(eq(userRoles.userId, userId));
    console.log('🔄 角色更新为皇帝');
  } else {
    // 创建新的角色分配
    await db.insert(userRoles)
      .values({
        userId: userId,
        roleId: emperorRole.id
      });
    console.log('✅ 皇帝角色分配成功');
  }
}

async function main() {
  console.log('🏛️  MoeMail 皇帝用户初始化工具');
  console.log('=' .repeat(40));
  
  try {
    await createEmperorUser();
    
    console.log('\n' + '='.repeat(40));
    console.log('🎯 下一步操作:');
    console.log('1. 在浏览器中访问: http://localhost:3000');
    console.log('2. 点击登录，选择用户名密码登录');
    console.log(`3. 使用用户名: ${EMPEROR_USER.username}`);
    console.log(`4. 使用密码: ${EMPEROR_USER.password}`);
    console.log('5. 登录后即可测试用户管理功能');
    
  } catch (error) {
    console.error('\n❌ 初始化失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main();
