// 检查数据库结构的脚本
import { createDb } from '../app/lib/db'

async function checkDatabaseStructure() {
  try {
    console.log('🔍 检查数据库结构...')
    
    const db = createDb()
    
    // 检查用户表结构
    const result = await db.all(`PRAGMA table_info(user)`)
    
    console.log('\n📋 用户表字段信息:')
    console.log('----------------------------------------')
    
    const expectedFields = [
      'expires_at',
      'status', 
      'last_login_at',
      'created_at'
    ]
    
    const existingFields = result.map((row: any) => row.name)
    
    result.forEach((row: any) => {
      const isNew = expectedFields.includes(row.name)
      const marker = isNew ? '🆕' : '  '
      console.log(`${marker} ${row.name}: ${row.type} ${row.dflt_value ? `(默认: ${row.dflt_value})` : ''}`)
    })
    
    console.log('\n🔍 检查新增字段:')
    expectedFields.forEach(field => {
      const exists = existingFields.includes(field)
      console.log(`${exists ? '✅' : '❌'} ${field}: ${exists ? '已添加' : '缺失'}`)
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
      console.log(`${exists ? '✅' : '❌'} ${indexName}: ${exists ? '已创建' : '缺失'}`)
    })
    
    // 检查现有用户数据
    console.log('\n👥 检查现有用户数据:')
    const users = await db.all(`SELECT id, username, status, expires_at, created_at FROM user LIMIT 5`)
    
    if (users.length > 0) {
      console.log(`找到 ${users.length} 个用户 (显示前5个):`)
      users.forEach((user: any) => {
        console.log(`  - ${user.username}: 状态=${user.status || 'NULL'}, 过期时间=${user.expires_at || 'NULL'}`)
      })
    } else {
      console.log('没有找到用户数据')
    }
    
    console.log('\n🎉 数据库结构检查完成!')
    
  } catch (error) {
    console.error('❌ 检查数据库结构时出错:', error)
    process.exit(1)
  }
}

checkDatabaseStructure()
