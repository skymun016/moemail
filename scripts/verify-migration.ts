// 验证数据库迁移的脚本
import { createDb } from '../app/lib/db'

async function verifyMigration() {
  try {
    console.log('🔍 验证数据库迁移状态...\n')
    
    const db = createDb()
    
    // 检查用户表结构
    console.log('📋 检查用户表字段:')
    const tableInfo = await db.all(`PRAGMA table_info(user)`)
    
    const expectedFields = [
      'expires_at',
      'status', 
      'last_login_at',
      'created_at'
    ]
    
    const existingFields = tableInfo.map((row: any) => row.name)
    
    expectedFields.forEach(field => {
      const exists = existingFields.includes(field)
      const status = exists ? '✅' : '❌'
      console.log(`  ${status} ${field}: ${exists ? '已添加' : '缺失'}`)
    })
    
    // 检查索引
    console.log('\n📊 检查索引:')
    const indexes = await db.all(`PRAGMA index_list(user)`)
    const expectedIndexes = [
      'user_expires_at_idx',
      'user_status_idx', 
      'user_last_login_idx',
      'user_created_at_idx'
    ]
    
    const existingIndexes = indexes.map((idx: any) => idx.name)
    
    expectedIndexes.forEach(indexName => {
      const exists = existingIndexes.includes(indexName)
      const status = exists ? '✅' : '❌'
      console.log(`  ${status} ${indexName}: ${exists ? '已创建' : '缺失'}`)
    })
    
    // 检查现有用户数据
    console.log('\n👥 检查现有用户数据:')
    const userCount = await db.get(`SELECT COUNT(*) as count FROM user`)
    console.log(`  总用户数: ${userCount?.count || 0}`)
    
    if (userCount?.count > 0) {
      // 检查新字段的默认值
      const sampleUsers = await db.all(`
        SELECT id, username, status, expires_at, created_at, last_login_at 
        FROM user 
        LIMIT 3
      `)
      
      console.log('\n  示例用户数据:')
      sampleUsers.forEach((user: any, index: number) => {
        console.log(`    ${index + 1}. ${user.username}:`)
        console.log(`       状态: ${user.status || 'NULL'}`)
        console.log(`       过期时间: ${user.expires_at || 'NULL'}`)
        console.log(`       创建时间: ${user.created_at || 'NULL'}`)
        console.log(`       最后登录: ${user.last_login_at || 'NULL'}`)
      })
    }
    
    // 测试用户状态更新
    console.log('\n🧪 测试用户状态功能:')
    try {
      // 尝试更新一个用户的状态（如果存在用户）
      const firstUser = await db.get(`SELECT id FROM user LIMIT 1`)
      if (firstUser) {
        await db.update(users)
          .set({ status: 'active' })
          .where(eq(users.id, firstUser.id))
        console.log('  ✅ 用户状态更新测试成功')
      } else {
        console.log('  ⚠️  没有用户可供测试')
      }
    } catch (error) {
      console.log('  ❌ 用户状态更新测试失败:', error)
    }
    
    console.log('\n🎉 数据库迁移验证完成!')
    
  } catch (error) {
    console.error('❌ 验证数据库迁移时出错:', error)
    process.exit(1)
  }
}

verifyMigration()
