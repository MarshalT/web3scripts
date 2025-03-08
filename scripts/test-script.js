// 一个简单的测试函数
function testFunction(walletData, args) {
    console.log('测试函数执行成功');
    console.log('参数:', args);
    return {
        success: true,
        message: '测试成功',
        time: new Date().toISOString()
        //123456
    };
}

// 导出函数
module.exports = {
    testFunction
}; 