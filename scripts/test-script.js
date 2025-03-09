// 一个简单的测试函数
async function testFunction(walletData, args) {
    console.log('测试函数执行成功');
    // console.log('参数:', args);
    return {
        success: true,
        data: {
            message: '测试成功',
            time: new Date().toISOString()
            //12344
        }
    };
}

// 导出函数
module.exports = {
    testFunction
}; 