// 使用一些常用的依赖
const axios = require('axios');
const ethers = require('ethers');
const fs = require('fs-extra');

async function testDependencies(walletData, args) {
    console.log('开始测试依赖...');
    
    // 测试 axios (使用免费的加密货币API)
    console.log('测试 axios...');
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    
    // 测试 ethers
    console.log('测试 ethers...');
    const wallet = ethers.Wallet.createRandom();
    
    // 测试 fs-extra
    console.log('测试 fs-extra...');
    const tempFile = 'test.json';
    await fs.writeJson(tempFile, { test: 'success' });
    const readBack = await fs.readJson(tempFile);
    await fs.remove(tempFile);
    
    // 返回测试结果
    return {
        axios: {
            working: true,
            data: response.data
        },
        ethers: {
            working: true,
            address: wallet.address,
            mnemonic: wallet.mnemonic?.phrase
        },
        fs: {
            working: true,
            testData: readBack
        },
        time: new Date().toISOString()
    };
}

// 导出函数
module.exports = {
    testDependencies
}; 