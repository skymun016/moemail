// 检查API返回的实际数据
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkApiData() {
  try {
    console.log('🔍 检查API返回的实际数据...\n');
    
    // 找到数据库文件
    const dbDir = './.wrangler/state/v3/d1/miniflare-D1DatabaseObject/';
    const files = fs.readdirSync(dbDir);
    const dbFile = files.find(f => f.endsWith('.sqlite'));
    
    if (!dbFile) {
      console.log('❌ 未找到数据库文件');
      return;
    }
    
    const dbPath = path.join(dbDir, dbFile);
    
    // 模拟API查询逻辑，查看实际返回的数据
    console.log('📊 模拟API查询逻辑:');
    try {
      // 查询用户数据，包括角色信息
      const userData = execSync(`sqlite3 "${dbPath}" "SELECT u.id, u.username, u.expires_at, u.status, u.max_emails, u.is_admin_created, r.name as role FROM user u LEFT JOIN user_role ur ON u.id = ur.user_id LEFT JOIN role r ON ur.role_id = r.id WHERE u.username='amesky01';"`, { encoding: 'utf8' });
      
      if (userData.trim()) {
        const parts = userData.trim().split('|');
        const user = {
          id: parts[0],
          username: parts[1],
          expiresAt: parts[2],
          status: parts[3],
          maxEmails: parts[4],
          isAdminCreated: parts[5] === '1',
          role: parts[6] || 'unknown'
        };
        
        console.log('👤 API 应该返回的用户数据:');
        console.log(JSON.stringify(user, null, 2));
        
        console.log('\n🔍 关键字段分析:');
        console.log(`user.expiresAt: ${user.expiresAt}`);
        console.log(`typeof user.expiresAt: ${typeof user.expiresAt}`);
        console.log(`Boolean(user.expiresAt): ${Boolean(user.expiresAt)}`);
        console.log(`user.expiresAt === null: ${user.expiresAt === null}`);
        console.log(`user.expiresAt === undefined: ${user.expiresAt === undefined}`);
        console.log(`user.expiresAt === '': ${user.expiresAt === ''}`);
        
        // 模拟前端逻辑
        console.log('\n🎨 模拟前端显示逻辑:');
        const now = new Date();
        
        if (user.expiresAt) {
          console.log('✅ user.expiresAt 存在，进入时间计算逻辑');
          
          // 原始逻辑（可能有问题）
          console.log('\n📝 原始逻辑测试:');
          try {
            const expiresAt1 = new Date(user.expiresAt);
            console.log(`new Date(user.expiresAt): ${expiresAt1}`);
            console.log(`expiresAt1.getTime(): ${expiresAt1.getTime()}`);
          } catch (error) {
            console.log(`❌ 原始逻辑失败: ${error.message}`);
          }
          
          // 修复后的逻辑
          console.log('\n🔧 修复后逻辑测试:');
          try {
            const timestamp = typeof user.expiresAt === 'string' ? parseInt(user.expiresAt) : user.expiresAt;
            console.log(`timestamp: ${timestamp} (类型: ${typeof timestamp})`);
            
            const expiresAt2 = new Date(timestamp);
            console.log(`new Date(timestamp): ${expiresAt2}`);
            
            const timeDiff = expiresAt2.getTime() - now.getTime();
            const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            console.log(`timeDiff: ${timeDiff}ms`);
            console.log(`daysRemaining: ${daysRemaining}天`);
            
            const displayText = daysRemaining && daysRemaining > 0 ? `${daysRemaining}天后过期` : '正常';
            console.log(`应显示: ${displayText}`);
            
          } catch (error) {
            console.log(`❌ 修复后逻辑也失败: ${error.message}`);
          }
          
        } else {
          console.log('❌ user.expiresAt 不存在，会显示"永久有效"');
          console.log('这就是问题所在！');
        }
        
      } else {
        console.log('❌ 未找到 amesky01 用户');
      }
      
    } catch (error) {
      console.log('❌ 无法读取用户数据:', error.message);
    }
    
    console.log('\n🎉 API数据检查完成!');
    
  } catch (error) {
    console.error('❌ 检查API数据时出错:', error.message);
  }
}

checkApiData();
