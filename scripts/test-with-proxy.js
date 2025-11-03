#!/usr/bin/env node

/**
 * 跨平台测试脚本，自动设置代理环境变量并运行Jest
 */

// 设置代理环境变量
process.env.USE_SYSTEM_PROXY = 'true';
process.env.HTTP_PROXY = 'http://127.0.0.1:10809';
process.env.HTTPS_PROXY = 'http://127.0.0.1:10809';

console.log('🚀 运行测试 - 自动配置代理');
console.log('📋 环境变量:');
console.log(`   USE_SYSTEM_PROXY: ${process.env.USE_SYSTEM_PROXY}`);
console.log(`   HTTP_PROXY: ${process.env.HTTP_PROXY}`);
console.log(`   HTTPS_PROXY: ${process.env.HTTPS_PROXY}`);

// 获取传递给脚本的参数
const args = process.argv.slice(2);

// 构建Jest命令
const { spawn } = require('child_process');

console.log('\n🧪 启动Jest...');
console.log(`   命令: jest ${args.join(' ')}`);

const jestProcess = spawn('jest', args, {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

jestProcess.on('close', (code) => {
  console.log(`\n📊 测试完成，退出码: ${code}`);
  process.exit(code);
});

jestProcess.on('error', (error) => {
  console.error('❌ Jest启动失败:', error.message);
  process.exit(1);
});