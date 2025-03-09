/**
 * 模块加载测试脚本
 * 用于测试各种模块是否可以正确加载
 */


async function testModules(walletData, args) {
    console.log('测试模块加载函数被调用');
    console.log('钱包数据:', walletData);
    console.log('参数:', args);

    // 测试依赖模块是否可用
    console.log('开始测试依赖...');

    // 测试 node-fetch
    try {
        console.log('测试 node-fetch...');
        const fetch = require('node-fetch');
        console.log('node-fetch 加载成功');
    } catch (error) {
        console.error('node-fetch 加载失败:', error.message);
        return { success: false, error: `node-fetch 加载失败: ${error.message}` };
    }

    // 测试 axios
    try {
        console.log('测试 axios...');
        const axios = require('axios');
        console.log('axios 加载成功');
    } catch (error) {
        console.error('axios 加载失败:', error.message);
        return { success: false, error: `axios 加载失败: ${error.message}` };
    }

    // 测试 fs-extra
    try {
        console.log('测试 fs-extra...');
        const fs = require('fs-extra');
        console.log('fs-extra 加载成功');
    } catch (error) {
        console.error('fs-extra 加载失败:', error.message);
        return { success: false, error: `fs-extra 加载失败: ${error.message}` };
    }

    // 测试文件操作
    try {
        console.log('测试文件操作...');
        const fs = require('fs');
        const path = require('path');

        // 获取当前目录
        const currentDir = process.cwd();
        console.log('当前工作目录:', currentDir);

        // 测试文件写入
        const testFile = path.join(currentDir, 'test.json');
        fs.writeFileSync(testFile, JSON.stringify({ test: true }), 'utf8');
        console.log('文件写入测试成功:', testFile);

        // 读取文件
        const content = fs.readFileSync(testFile, 'utf8');
        console.log('文件读取测试成功:', content);

        // 删除测试文件
        fs.unlinkSync(testFile);
        console.log('文件删除测试成功');
    } catch (error) {
        console.error('文件操作测试失败:', error.message);
        return { success: false, error: `文件操作测试失败: ${error.message}` };
    }

    // 测试完成
    console.log('依赖测试完成');
    return { success: true, data: { success: true, message: '所有模块测试完成' } }
}

// 导出函数
module.exports = {
    testModules
};  