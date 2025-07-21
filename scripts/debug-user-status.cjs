// 调试用户状态显示逻辑
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function debugUserStatus() {
  try {
    console.log('🔍 调试用户状态显示逻辑...\n');
    
    // 找到数据库文件
    const dbDir = './.wrangler/state/v3/d1/miniflare-D1DatabaseObject/';
    const files = fs.readdirSync(dbDir);
    const dbFile = files.find(f => f.endsWith('.sqlite'));
    
    if (!dbFile) {
      console.log('❌ 未找到数据库文件');
      return;
    }
    
    const dbPath = path.join(dbDir, dbFile);
    
    // 查询 amesky01 用户的详细信息
    console.log('👤 amesky01 用户详细信息:');
    try {
      const userData = execSync(`sqlite3 "${dbPath}" "SELECT id, username, expires_at, status, created_at, last_login_at FROM user WHERE username='amesky01';"`, { encoding: 'utf8' });
      const userLine = userData.trim();
      
      if (userLine) {
        const parts = userLine.split('|');
        const id = parts[0];
        const username = parts[1];
        const expiresAt = parts[2];
        const status = parts[3];
        const createdAt = parts[4];
        const lastLoginAt = parts[5];
        
        console.log(`ID: ${id}`);
        console.log(`用户名: ${username}`);
        console.log(`过期时间戳: ${expiresAt}`);
        console.log(`状态: ${status}`);
        console.log(`创建时间戳: ${createdAt}`);
        console.log(`最后登录时间戳: ${lastLoginAt}`);
        
        // 模拟前端逻辑
        const now = new Date();
        console.log(`\n🕐 当前时间: ${now.toLocaleString()}`);
        console.log(`当前时间戳: ${now.getTime()}`);
        
        if (expiresAt && expiresAt !== '') {
          const expiryDate = new Date(parseInt(expiresAt));
          const timeDiff = expiryDate.getTime() - now.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
          
          console.log(`\n📅 过期时间: ${expiryDate.toLocaleString()}`);
          console.log(`时间差: ${timeDiff}ms`);
          console.log(`剩余天数: ${daysRemaining}天`);
          console.log(`即将过期: ${isExpiringSoon}`);
          
          // 模拟前端显示逻辑
          const displayText = daysRemaining && daysRemaining > 0 ? `${daysRemaining}天后过期` : '正常';
          const color = isExpiringSoon ? 'orange' : 'green';
          
          console.log(`\n🎨 前端显示:`);
          console.log(`文本: ${displayText}`);
          console.log(`颜色: ${color}`);
          
        } else {
          console.log(`\n♾️  过期时间为空，应显示"永久有效"`);
        }
        
        // 检查前端可能收到的数据格式
        console.log(`\n📊 前端可能收到的数据:`);
        console.log(`user.expiresAt: ${expiresAt} (类型: ${typeof expiresAt})`);
        console.log(`user.status: ${status}`);
        
        // 检查是否为 null 或 undefined
        console.log(`\n🔍 空值检查:`);
        console.log(`expiresAt === null: ${expiresAt === null}`);
        console.log(`expiresAt === undefined: ${expiresAt === undefined}`);
        console.log(`expiresAt === '': ${expiresAt === ''}`);
        console.log(`!expiresAt: ${!expiresAt}`);
        console.log(`Boolean(expiresAt): ${Boolean(expiresAt)}`);
        
      } else {
        console.log('❌ 未找到 amesky01 用户');
      }
      
    } catch (error) {
      console.log('❌ 无法读取用户数据:', error.message);
    }
    
    console.log('\n🎉 调试完成!');
    
  } catch (error) {
    console.error('❌ 调试时出错:', error.message);
  }
}

debugUserStatus();
