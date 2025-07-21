// 测试API响应格式的脚本
const fetch = require('node-fetch');

async function testApiResponse() {
  try {
    console.log('🔍 测试用户列表API响应格式...\n');
    
    // 模拟API请求
    const response = await fetch('http://localhost:3000/api/admin/users?page=1&limit=20', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 注意：这里需要有效的认证，但我们先看看能否获取到数据结构
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API响应成功');
      console.log('📊 响应数据结构:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.users && data.users.length > 0) {
        console.log('\n👥 用户数据示例:');
        data.users.forEach((user, index) => {
          console.log(`${index + 1}. 用户: ${user.username}`);
          console.log(`   ID: ${user.id}`);
          console.log(`   expiresAt: ${user.expiresAt} (类型: ${typeof user.expiresAt})`);
          console.log(`   status: ${user.status}`);
          console.log(`   lastLoginAt: ${user.lastLoginAt}`);
          console.log(`   createdAt: ${user.createdAt}`);
          console.log('');
        });
      }
    } else {
      console.log(`❌ API响应失败: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('错误信息:', errorText);
    }
    
  } catch (error) {
    console.error('❌ 测试API时出错:', error.message);
  }
}

testApiResponse();
