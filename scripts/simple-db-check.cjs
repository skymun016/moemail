// 简单的数据库检查脚本
const Database = require('better-sqlite3');
const path = require('path');

async function checkDatabase() {
  try {
    console.log('🔍 检查本地数据库结构...\n');
    
    // 连接到本地数据库
    const dbPath = path.join(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/moemail.sqlite');
    const db = new Database(dbPath);
    
    // 检查用户表结构
    console.log('📋 用户表字段信息:');
    const tableInfo = db.prepare(`PRAGMA table_info(user)`).all();
    
    const expectedFields = [
      'expires_at',
      'status', 
      'last_login_at',
      'created_at'
    ];
    
    const existingFields = tableInfo.map(row => row.name);
    
    tableInfo.forEach(row => {
      const isNew = expectedFields.includes(row.name);
      const marker = isNew ? '🆕' : '  ';
      const defaultValue = row.dflt_value ? ` (默认: ${row.dflt_value})` : '';
      console.log(`${marker} ${row.name}: ${row.type}${defaultValue}`);
    });
    
    console.log('\n🔍 检查新增字段:');
    expectedFields.forEach(field => {
      const exists = existingFields.includes(field);
      console.log(`${exists ? '✅' : '❌'} ${field}: ${exists ? '已添加' : '缺失'}`);
    });
    
    // 检查索引
    console.log('\n📊 检查索引:');
    const indexes = db.prepare(`PRAGMA index_list(user)`).all();
    const expectedIndexes = [
      'user_expires_at_idx',
      'user_status_idx', 
      'user_last_login_idx',
      'user_created_at_idx'
    ];
    
    const existingIndexes = indexes.map(idx => idx.name);
    
    expectedIndexes.forEach(indexName => {
      const exists = existingIndexes.includes(indexName);
      console.log(`${exists ? '✅' : '❌'} ${indexName}: ${exists ? '已创建' : '缺失'}`);
    });
    
    // 检查现有用户数据
    console.log('\n👥 检查现有用户数据:');
    const userCount = db.prepare(`SELECT COUNT(*) as count FROM user`).get();
    console.log(`总用户数: ${userCount.count}`);
    
    if (userCount.count > 0) {
      const sampleUsers = db.prepare(`
        SELECT id, username, status, expires_at, created_at, last_login_at 
        FROM user 
        LIMIT 3
      `).all();
      
      console.log('\n示例用户数据:');
      sampleUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.username}:`);
        console.log(`     状态: ${user.status || 'NULL'}`);
        console.log(`     过期时间: ${user.expires_at || 'NULL'}`);
        console.log(`     创建时间: ${user.created_at || 'NULL'}`);
        console.log(`     最后登录: ${user.last_login_at || 'NULL'}`);
      });
    }
    
    db.close();
    console.log('\n🎉 数据库检查完成!');
    
  } catch (error) {
    console.error('❌ 检查数据库时出错:', error.message);
    
    // 如果数据库文件不存在，提供帮助信息
    if (error.code === 'SQLITE_CANTOPEN') {
      console.log('\n💡 提示: 本地数据库文件可能不存在。请确保：');
      console.log('1. 已经运行过 npm run dev');
      console.log('2. 数据库迁移已完成');
      console.log('3. 数据库文件路径正确');
    }
    
    process.exit(1);
  }
}

checkDatabase();
