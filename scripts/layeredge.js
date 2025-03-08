const axios = require('axios');
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 基础 URL
const BASE_URL = 'https://referralapi.layeredge.io/api';



// 默认配置
const DEFAULT_CONFIG = {
  inviteCode: 'ymSuPIKn',
  wallets: []
};



// 验证推荐码
async function verifyReferralCode(inviteCode) {
  try {
    console.log(`正在验证推荐码: ${inviteCode}`);
    const response = await axios.post(`${BASE_URL}/referral/verify-referral-code`,
      { invite_code: inviteCode },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://layeredge.io',
          'Referer': 'https://layeredge.io/'
        },
        timeout: 20000 // 10秒超时
      }
    );

    console.log('推荐码验证结果:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      // 服务器响应了，但状态码不在 2xx 范围内
      console.error(`验证推荐码失败: 状态码 ${error.response.status}`);
      console.error('错误详情:', error.response.data);
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error('验证推荐码失败: 未收到服务器响应');
    } else {
      // 设置请求时发生了错误
      console.error('验证推荐码失败:', error.message);
    }

    // 提示用户
    console.log('\n可能的解决方案:');
    console.log('1. 检查网络连接');
    console.log('2. 确认推荐码是否正确');
    console.log('3. LayerEdge 服务器可能暂时不可用，请稍后再试');

    throw error;
  }
}

// 注册钱包
async function registerWallet(inviteCode, walletAddress) {
  try {
    console.log(`正在注册钱包 ${walletAddress} 到推荐码 ${inviteCode}`);
    const response = await axios.post(`${BASE_URL}/referral/register-wallet/${inviteCode}`,
      { walletAddress: walletAddress },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://layeredge.io',
          'Referer': 'https://layeredge.io/'
        },
        timeout: 20000 // 10秒超时
      }
    );

    console.log('钱包注册结果:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      // 服务器响应了，但状态码不在 2xx 范围内
      console.error(`注册钱包失败: 状态码 ${error.response.status}`);
      console.error('错误详情:', error.response.data);

      // 如果是已注册的钱包，通常会返回特定错误，可以友好提示
      if (error.response.status === 400 && error.response.data &&
        (error.response.data.message?.includes('already registered') ||
          JSON.stringify(error.response.data).includes('already registered'))) {
        console.log('该钱包可能已经注册过，继续处理');
        return { success: true, message: 'Wallet might be already registered' };
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error('注册钱包失败: 未收到服务器响应');
    } else {
      // 设置请求时发生了错误
      console.error('注册钱包失败:', error.message);
    }

    throw error;
  }
}

// 生成签名消息
function generateSignMessage(walletAddress, timestamp) {
  return `I am claiming my daily node point for ${walletAddress} at ${timestamp}`;
}

// 使用钱包签名消息
async function signMessage(privateKey, message) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    console.log(`使用钱包 ${wallet.address} 签名消息...`);
    const signature = await wallet.signMessage(message);
    console.log('签名成功');
    return signature;
  } catch (error) {
    console.error('签名失败:', error.message);
    throw error;
  }
}

// 领取节点积分
async function claimNodePoints(walletAddress, privateKey) {
  try {
    // 生成当前时间戳
    const timestamp = Date.now();

    // 生成签名消息
    const message = generateSignMessage(walletAddress, timestamp);
    console.log('签名消息:', message);

    // 签名消息
    const signature = await signMessage(privateKey, message);

    // 发送请求
    console.log('正在领取节点积分...');
    const response = await axios.post(`${BASE_URL}/light-node/claim-node-points`,
      {
        walletAddress: walletAddress,
        timestamp: timestamp,
        sign: signature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://layeredge.io',
          'Referer': 'https://layeredge.io/'
        },
        timeout: 20000 // 15秒超时
      }
    );

    console.log('领取节点积分结果:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      // 服务器响应了，但状态码不在 2xx 范围内
      console.error(`领取节点积分失败: 状态码 ${error.response.status}`);
      console.error('错误详情:', error.response.data);

      // 如果是405错误，表示24小时内已经领取过，直接返回成功
      if (error.response.status === 405) {
        console.log('今天可能已经领取过积分');
        return { success: true, message: 'Points might be already claimed today' };
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error('领取节点积分失败: 未收到服务器响应');
    } else {
      // 设置请求时发生了错误
      console.error('领取节点积分失败:', error.message);
    }

    throw error;
  }
}


// 添加生成节点激活签名消息的函数
function generateNodeActivationMessage(walletAddress, timestamp) {
  return `Node activation request for ${walletAddress} at ${timestamp}`;
}

// 添加启动节点的函数
async function startNode(walletAddress, privateKey) {
  try {
    // 生成当前时间戳
    const timestamp = Date.now();

    // 生成签名消息
    const message = generateNodeActivationMessage(walletAddress, timestamp);
    console.log('签名消息:', message);

    // 签名消息
    const signature = await signMessage(privateKey, message);

    // 发送请求
    console.log('正在启动节点...');
    const response = await axios.post(`${BASE_URL}/light-node/node-action/${walletAddress}/start`,
      {
        sign: signature,
        timestamp: timestamp
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://layeredge.io',
          'Referer': 'https://layeredge.io/'
        },
        timeout: 20000 // 15秒超时
      }
    );

    console.log('节点启动结果:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      // 服务器响应了，但状态码不在 2xx 范围内
      console.error(`节点启动失败: 状态码 ${error.response.status}`);
      console.error('错误详情:', error.response.data);
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error('节点启动失败: 未收到服务器响应');
    } else {
      // 设置请求时发生了错误
      console.error('节点启动失败:', error.message);
    }

    throw error;
  }
}

// 修改验证节点的函数，添加验证成功后启动节点的逻辑
async function verifyNodeCaptcha(walletAddress, privateKey, captchaToken) {
  try {
    return await startNode(walletAddress, privateKey);
    // 发送验证请求
    console.log('正在验证节点...');
    const response = await axios.post('https://dashboard.layeredge.io/api/verify-captcha',
      {
        token: captchaToken
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://layeredge.io',
          'Referer': 'https://layeredge.io/'
        },
        timeout: 15000 // 15秒超时
      }
    );

    console.log('节点验证结果:', response.data);

    // 验证成功后，启动节点
    if (response.data && (response.data.success || response.status === 200)) {
      console.log('验证成功，正在启动节点...');
      // 等待一小段时间再启动节点
      await delay(2000);
      return await startNode(walletAddress, privateKey);
    } else {
      console.log('验证未成功，不启动节点');
      return response.data;
    }
  } catch (error) {
    if (error.response) {
      // 服务器响应了，但状态码不在 2xx 范围内
      console.error(`节点验证失败: 状态码 ${error.response.status}`);
      console.error('错误详情:', error.response.data);
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error('节点验证失败: 未收到服务器响应');
    } else {
      // 设置请求时发生了错误
      console.error('节点验证失败:', error.message);
    }

    throw error;
  }
}

// 添加获取reCAPTCHA token的函数（手动输入方式）
async function getManualCaptchaToken() {
  console.log('\n===== 获取reCAPTCHA Token =====');
  console.log('请访问 LayerEdge 网站，完成验证码后获取token');
  console.log('提示: 您可以使用浏览器开发者工具查看网络请求，找到verify-captcha请求中的token参数');

  return new Promise(resolve => {
    rl.question('请输入reCAPTCHA token: ', token => {
      resolve(token.trim());
    });
  });
}

// 添加延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 添加重试函数
async function retryOperation(operation, maxRetries = 3, initialDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // 计算指数退避延迟
        const delayTime = initialDelay * Math.pow(2, attempt - 1);
        console.log(`操作失败，${delayTime / 1000}秒后进行第${attempt + 1}次尝试...`);
        await delay(delayTime);
      }
    }
  }

  throw lastError;
}

// 添加日志格式化函数
function logSection(title, content) {
  console.log('\n' + '='.repeat(50));
  console.log(`【${title}】`);
  console.log('='.repeat(50));
  if (typeof content === 'object') {
    console.log(JSON.stringify(content, null, 2));
  } else {
    console.log(content);
  }
}

// 获取格式化的本地时间字符串
function getFormattedLocalTime() {
  const now = new Date();
  return now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 批量创建和处理钱包
async function batchCreateAndProcessWallets(walletData, args = {}) {
  try {
    // 检查钱包数据
    let wallets = [];
    if (walletData && Array.isArray(walletData.wallets)) {
      wallets = walletData.wallets;
    } else if (walletData && Array.isArray(walletData)) {
      wallets = walletData;
    } else {
      throw new Error('无效的钱包数据格式');
    }

    logSection('开始处理钱包', `数量: ${wallets.length}`);
    
    // 验证邀请码
    const inviteCode = args.inviteCode || 'ymSuPIKn';
    logSection('验证邀请码', inviteCode);
    
    try {
      await retryOperation(async () => await verifyReferralCode(inviteCode));
      console.log('邀请码验证成功！');
    } catch (error) {
      console.error('邀请码验证失败，流程终止');
      return { success: false, error: error.message };
    }
    
    let successCount = 0;
    let failCount = 0;
    const processedWallets = [];

    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      logSection(`处理钱包`, `${i + 1}/${wallets.length}: ${wallet.address}`);
      
      let walletSuccess = true;
      let claimSuccess = true;

      // 注册钱包
      try {
        await retryOperation(async () => await registerWallet(inviteCode, wallet.address));
        console.log(`钱包注册成功！`);
      } catch (error) {
        console.log(`钱包注册失败，但将继续尝试领取积分`);
        walletSuccess = false;
      }

      // 领取积分
      try {
        await retryOperation(async () => await claimNodePoints(wallet.address, wallet.privateKey));
        console.log(`节点积分领取成功！`);
        if (walletSuccess) successCount++;
      } catch (error) {
        console.log(`节点积分领取失败`);
        failCount++;
        walletSuccess = false;
      }

      // 激活节点
      const captchaToken = '0399666666666666666666666666666666666666666666666666666666666666';
      let nodeActivated = false;
      
      try {          
        await retryOperation(async () => await verifyNodeCaptcha(wallet.address, wallet.privateKey, captchaToken));
        console.log(`节点激活和启动成功！`);
        nodeActivated = true;
      } catch (error) {
        console.error(`节点激活失败: ${error.message}`);
      }

      // 记录处理结果
      processedWallets.push({
        address: wallet.address,
        privateKey: wallet.privateKey,
        registered: walletSuccess,
        claimed: claimSuccess,
        activated: nodeActivated,
        createdAt: new Date().toISOString()
      });

    

      // 添加延迟
      if (i < wallets.length - 1) {
        const delay = 3000 + Math.floor(Math.random() * 4000);
        console.log(`等待 ${delay / 1000} 秒后处理下一个钱包...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    logSection('批量处理完成', {
      总钱包数: wallets.length,
      成功处理: successCount,
      失败处理: failCount
    });

    return { 
      success: true, 
      results: { 
        successCount, 
        failCount, 
      } 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 批量领取积分
async function batchClaimPoints(walletData, args = {}) {
  try {
    // 检查钱包数据
    let wallets = [];
    if (walletData && Array.isArray(walletData.wallets)) {
      wallets = walletData.wallets;
    } else if (walletData && Array.isArray(walletData)) {
      wallets = walletData;
    } else {
      throw new Error('无效的钱包数据格式');
    }

    if (wallets.length === 0) {
      return { success: false, error: '没有可用的钱包' };
    }

    logSection('开始批量领取积分', `钱包数量: ${wallets.length}`);
    let claimSuccessCount = 0;
    let claimFailCount = 0;
    const results = [];

    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      logSection(`处理钱包`, `${i + 1}/${wallets.length}: ${wallet.address}`);

      try {
        await retryOperation(async () => await claimNodePoints(wallet.address, wallet.privateKey));
        console.log(`节点积分领取成功！`);
        claimSuccessCount++;
        results.push({ address: wallet.address, success: true });
      } catch (error) {
        console.log(`节点积分领取失败`);
        claimFailCount++;
        results.push({ address: wallet.address, success: false, error: error.message });
      }

      if (i < wallets.length - 1) {
        const delay = 3000 + Math.floor(Math.random() * 4000);
        console.log(`等待 ${delay / 1000} 秒后处理下一个钱包...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    logSection('批量领取完成', {
      总钱包数: wallets.length,
      成功领取: claimSuccessCount,
      失败领取: claimFailCount
    });

    return { 
      success: true, 
      results: { 
        claimSuccessCount, 
        claimFailCount, 
        details: results 
      } 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 批量激活节点
async function batchActivateNodes(walletData, args = {}) {
  try {
    // 检查钱包数据
    let wallets = [];
    if (walletData && Array.isArray(walletData.wallets)) {
      wallets = walletData.wallets;
    } else if (walletData && Array.isArray(walletData)) {
      wallets = walletData;
    } else {
      throw new Error('无效的钱包数据格式');
    }

    if (wallets.length === 0) {
      return { success: false, error: '没有可用的钱包' };
    }

    logSection('开始批量激活节点', `钱包数量: ${wallets.length}`);
    let activationSuccessCount = 0;
    let activationFailCount = 0;
    const results = [];

    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      logSection(`处理钱包`, `${i + 1}/${wallets.length}: ${wallet.address}`);

      const captchaToken = '0399666666666666666666666666666666666666666666666666666666666666';
      
      try {          
        await retryOperation(async () => await verifyNodeCaptcha(wallet.address, wallet.privateKey, captchaToken));
        console.log(`节点激活和启动成功！`);
        activationSuccessCount++;
        results.push({ address: wallet.address, success: true });
      } catch (error) {
        console.error(`节点激活失败: ${error.message}`);
        activationFailCount++;
        results.push({ address: wallet.address, success: false, error: error.message });
      }

      if (i < wallets.length - 1) {
        const delay = 3000 + Math.floor(Math.random() * 4000);
        console.log(`等待 ${delay / 1000} 秒后处理下一个钱包...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    logSection('批量激活完成', {
      总钱包数: wallets.length,
      成功激活: activationSuccessCount,
      失败激活: activationFailCount
    });

    return { 
      success: true, 
      results: { 
        activationSuccessCount, 
        activationFailCount, 
        details: results 
      } 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 导出函数
module.exports = {
  batchCreateAndProcessWallets,
  batchClaimPoints,
  batchActivateNodes,
}; 