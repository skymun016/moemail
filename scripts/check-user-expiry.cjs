// 检查用户过期时间的脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkUserExpiry() {
  try {
    console.log('🔍 检查用户过期时间...\n');
    
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
    
    // 查询用户数据
    console.log('👥 用户过期时间详情:');
    try {
      const userData = execSync(`sqlite3 "${dbPath}" "SELECT username, expires_at, status, created_at FROM user;"`, { encoding: 'utf8' });
      const dataLines = userData.trim().split('\n').filter(line => line.length > 0);
      
      const now = new Date();
      console.log(`当前时间: ${now.toLocaleString()}\n`);
      
      dataLines.forEach((line, index) => {
        const parts = line.split('|');
        const username = parts[0];
        const expiresAt = parts[1];
        const status = parts[2];
        const createdAt = parts[3];
        
        console.log(`${index + 1}. 用户: ${username}`);
        console.log(`   状态: ${status || 'NULL'}`);
        
        if (expiresAt && expiresAt !== '') {
          const expiryDate = new Date(parseInt(expiresAt));
          const timeDiff = expiryDate.getTime() - now.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          
          console.log(`   过期时间戳: ${expiresAt}`);
          console.log(`   过期日期: ${expiryDate.toLocaleString()}`);
          console.log(`   剩余天数: ${daysRemaining}天`);
          
          if (daysRemaining <= 0) {
            console.log(`   ⚠️  已过期 ${Math.abs(daysRemaining)}天`);
          } else if (daysRemaining <= 7) {
            console.log(`   🟡 即将过期 (${daysRemaining}天内)`);
          } else {
            console.log(`   🟢 正常 (还有${daysRemaining}天)`);
          }
        } else {
          console.log(`   过期时间: NULL (永久有效)`);
          console.log(`   🟢 永久有效`);
        }
        
        if (createdAt && createdAt !== '') {
          const createDate = new Date(parseInt(createdAt));
          console.log(`   创建时间: ${createDate.toLocaleString()}`);
        }
        
        console.log('');
      });
      
    } catch (error) {
      console.log('❌ 无法读取用户数据:', error.message);
    }
    
    console.log('🎉 用户过期时间检查完成!');
    
  } catch (error) {
    console.error('❌ 检查用户过期时间时出错:', error.message);
  }
}

checkUserExpiry();
