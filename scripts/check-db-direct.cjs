// 直接检查数据库文件
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkDatabase() {
  try {
    console.log('🔍 检查数据库迁移状态...\n');
    
    // 找到数据库文件
    const dbDir = './.wrangler/state/v3/d1/miniflare-D1DatabaseObject/';
    const files = fs.readdirSync(dbDir);
    const dbFile = files.find(f => f.endsWith('.sqlite'));
    
    if (!dbFile) {
      console.log('❌ 未找到数据库文件');
      return;
    }
    
    const dbPath = path.join(dbDir, dbFile);
    console.log(`📁 数据库文件: ${dbPath}\n`);
    
    // 使用 sqlite3 命令行工具检查表结构
    console.log('📋 用户表字段信息:');
    try {
      const tableInfo = execSync(`sqlite3 "${dbPath}" "PRAGMA table_info(user);"`, { encoding: 'utf8' });
      const lines = tableInfo.trim().split('\n');
      
      const expectedFields = ['expires_at', 'status', 'last_login_at', 'created_at'];
      const existingFields = [];
      
      lines.forEach(line => {
        const parts = line.split('|');
        if (parts.length >= 2) {
          const fieldName = parts[1];
          const fieldType = parts[2];
          const defaultValue = parts[4];
          
          existingFields.push(fieldName);
          const isNew = expectedFields.includes(fieldName);
          const marker = isNew ? '🆕' : '  ';
          const defVal = defaultValue && defaultValue !== '' ? ` (默认: ${defaultValue})` : '';
          console.log(`${marker} ${fieldName}: ${fieldType}${defVal}`);
        }
      });
      
      console.log('\n🔍 检查新增字段:');
      expectedFields.forEach(field => {
        const exists = existingFields.includes(field);
        console.log(`${exists ? '✅' : '❌'} ${field}: ${exists ? '已添加' : '缺失'}`);
      });
      
    } catch (error) {
      console.log('❌ 无法读取表结构:', error.message);
    }
    
    // 检查索引
    console.log('\n📊 检查索引:');
    try {
      const indexInfo = execSync(`sqlite3 "${dbPath}" "PRAGMA index_list(user);"`, { encoding: 'utf8' });
      const indexLines = indexInfo.trim().split('\n').filter(line => line.length > 0);
      
      const expectedIndexes = [
        'user_expires_at_idx',
        'user_status_idx', 
        'user_last_login_idx',
        'user_created_at_idx'
      ];
      
      const existingIndexes = [];
      indexLines.forEach(line => {
        const parts = line.split('|');
        if (parts.length >= 2) {
          existingIndexes.push(parts[1]);
        }
      });
      
      expectedIndexes.forEach(indexName => {
        const exists = existingIndexes.includes(indexName);
        console.log(`${exists ? '✅' : '❌'} ${indexName}: ${exists ? '已创建' : '缺失'}`);
      });
      
    } catch (error) {
      console.log('❌ 无法读取索引信息:', error.message);
    }
    
    // 检查用户数据
    console.log('\n👥 检查现有用户数据:');
    try {
      const userCount = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM user;"`, { encoding: 'utf8' });
      console.log(`总用户数: ${userCount.trim()}`);
      
      if (parseInt(userCount.trim()) > 0) {
        const sampleData = execSync(`sqlite3 "${dbPath}" "SELECT username, status, expires_at FROM user LIMIT 3;"`, { encoding: 'utf8' });
        const dataLines = sampleData.trim().split('\n').filter(line => line.length > 0);
        
        console.log('\n示例用户数据:');
        dataLines.forEach((line, index) => {
          const parts = line.split('|');
          console.log(`  ${index + 1}. ${parts[0]}:`);
          console.log(`     状态: ${parts[1] || 'NULL'}`);
          console.log(`     过期时间: ${parts[2] || 'NULL'}`);
        });
      }
      
    } catch (error) {
      console.log('❌ 无法读取用户数据:', error.message);
    }
    
    console.log('\n🎉 数据库检查完成!');
    
  } catch (error) {
    console.error('❌ 检查数据库时出错:', error.message);
    
    if (error.message.includes('sqlite3: command not found')) {
      console.log('\n💡 提示: 需要安装 sqlite3 命令行工具');
      console.log('macOS: brew install sqlite');
      console.log('Ubuntu: sudo apt-get install sqlite3');
    }
  }
}

checkDatabase();
