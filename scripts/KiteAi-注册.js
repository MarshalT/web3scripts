// KiteAI 自动化脚本
// 创建时间: ${new Date().toLocaleString('zh-CN')}

// 导入必要的依赖
const axios = require('axios');
const { ethers } = require('ethers');

// API 基础 URL
const API_BASE_URL = 'https://api-kiteai.bonusblock.io/api';

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

// 获取本地日期字符串函数
function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate());
    return `${year}-${month}-${day}`;
}

// 存储 token 的变量
let authToken = null;

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

// 生成当前时间戳
const generateNonce = () => `timestamp_${Date.now()}`;

// 从认证结果中获取并存储 token
function setAuthToken(authResult) {
    if (authResult?.payload?.session?.token) {
        authToken = authResult.payload.session.token;
        return true;
    }
    return false;
}

// 获取存储的 token
function getAuthToken() {
    return authToken;
}

// 获取认证票据
async function getAuthTicket(nonce) {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/get-auth-ticket`, {
            nonce: nonce
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return response.data.payload;
    } catch (error) {
        console.log('获取认证票据失败: ' + error.message);
        throw error;
    }
}

// 签名消息
async function signMessageWithWallet(message, wallet) {
    try {
        console.log('签名消息...');
        const signedMessage = await wallet.signMessage(message);
        console.log('签名成功');
        return signedMessage;
    } catch (error) {
        console.log('签名消息失败: ' + error.message);
        throw error;
    }
}

// 认证
async function authenticateWithEth(signedMessage, nonce) {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/eth`, {
            blockchainName: 'ethereum',
            signedMessage,
            nonce
        });

        const authResult = response.data;
        setAuthToken(authResult);

        console.log('\n认证结果:');
        console.log('-'.repeat(30));
        console.log(`用户ID: ${authResult.payload.account.userId}`);
        console.log(`创建时间: ${authResult.payload.account.createdOn}`);
        console.log(`Token: ${authResult.payload.session.token}`);
        console.log('-'.repeat(30));

        return authResult;
    } catch (error) {
        console.log('认证失败: ' + error.message);
        throw error;
    }
}

// 获取并排序任务列表
async function getMissions() {
    try {
        const response = await axios.get(`${API_BASE_URL}/kite-ai/missions`, {
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': getAuthToken()
            }
        });
        
        const missions = response.data.payload;
        const priorityOrder = {
            'kiteai-mission-onboarding-1': 1,
            'kiteai-mission-tutorial-1': 2,
            'kiteai-mission-social-3': 3
        };

        const sortedMissions = missions
            .map(mission => mission.id)
            .filter(id => priorityOrder[id])
            .sort((a, b) => priorityOrder[a] - priorityOrder[b]);

        console.log('\n要执行的任务:');
        sortedMissions.forEach((id, index) => {
            let taskName;
            switch(id) {
                case 'kiteai-mission-onboarding-1':
                    taskName = '新手任务';
                    break;
                case 'kiteai-mission-tutorial-1':
                    taskName = '教程任务';
                    break;
                case 'kiteai-mission-social-3':
                    taskName = 'Telegram任务';
                    break;
            }
            console.log(`${index + 1}. ${taskName} (${id})`);
        });
        
        return sortedMissions;
    } catch (error) {
        console.log('获取任务列表失败: ' + error.message);
        throw error;
    }
}

// 获取状态
async function getStatus() {
    try {
        const response = await axios.get(`${API_BASE_URL}/kite-ai/get-status`, {
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': getAuthToken()
            }
        });

        const data = response.data;
        const doneMissions = data.payload.doneMissions ? 
            data.payload.doneMissions.split(';') : [];

        console.log('\n用户状态:');
        console.log('-'.repeat(30));
        console.log(`用户ID: ${data.payload.account.userId}`);
        console.log(`经验值: ${data.payload.userXp}`);
        console.log(`排名: ${data.payload.rank}`);
        console.log(`已完成任务数: ${doneMissions.length}`);
        if (doneMissions.length > 0) {
            console.log('已完成的任务:');
            doneMissions.forEach((mission, index) => {
                console.log(`  ${index + 1}. ${mission}`);
            });
        }
        console.log('-'.repeat(30));

        return data;
    } catch (error) {
        console.log('获取状态失败: ' + error.message);
        throw error;
    }
}

// 完成新手任务
async function completeOnboarding() {
    try {
        await axios.get(`${API_BASE_URL}/kite-ai/complete-onboarding`, {
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': getAuthToken()
            }
        });
        console.log('完成新手任务');
    } catch (error) {
        console.log('完成新手任务失败: ' + error.message);
    }
}

// 转发链接
async function forwardLink(missionId) {
    try {
        console.log(`正在转发链接: ${missionId}...`);

        const token = getAuthToken();
        if (!token) {
            throw new Error('未找到认证令牌，请先完成认证');
        }

        const response = await axios.post(
            `${API_BASE_URL}/forward-link/go/${missionId}`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Auth-Token': token
                }
            }
        );

        if (response.data.success && response.data.payload) {
            console.log(`转发成功，目标 URL: ${response.data.payload}`);
            return response.data.payload;
        } else {
            console.log(`转发失败，没有返回有效的 URL`);
            return null;
        }
    } catch (error) {
        console.log(`转发链接 ${missionId} 失败: ${error.message}`);
        return null;
    }
}

// 完成社交媒体任务
async function completeSocialMediaTasks(missionId) {
    try {
        console.log(`开始完成社交媒体任务: ${missionId}...`);
        
        switch (missionId) {
            case 'kiteai-mission-social-3':
                console.log('执行 Telegram 加入任务...');
                await forwardLink(missionId);
                break;
                
            default:
                console.log(`未知的社交任务类型: ${missionId}`);
        }
        
        console.log(`社交媒体任务 ${missionId} 处理完成`);
    } catch (error) {
        console.log(`完成社交媒体任务 ${missionId} 时出错: ${error.message}`);
    }
}

// 处理单个钱包
async function processWallet(wallet) {
    const startTime = new Date();
    
    try {
        // 验证钱包对象
        if (!wallet) {
            throw new Error('钱包对象为空');
        }
        
        if (!wallet.address) {
            throw new Error('钱包对象缺少address属性');
        }
        
        if (!wallet.privateKey) {
            throw new Error('钱包对象缺少privateKey属性');
        }
        
        console.log(`开始处理钱包: ${wallet.address}`);
        console.log(`钱包私钥前10位: ${wallet.privateKey.substring(0, 10)}...`);
        
        // 生成 nonce
        const nonce = generateNonce();
        console.log('生成的 nonce: ' + nonce);

        try {
            // 获取认证票据
            const ticket = await getAuthTicket(nonce);
            
            // 创建钱包实例
            const walletInstance = new ethers.Wallet(wallet.privateKey);
            console.log(`创建钱包实例成功，地址: ${walletInstance.address}`);
            
            // 签名消息
            const signedMessage = await signMessageWithWallet(ticket, walletInstance);

            // 认证
            const authResult = await authenticateWithEth(signedMessage, nonce);

            // 获取排序后的任务列表
            const sortedMissionIds = await getMissions();

            // 按顺序执行任务
            for (const missionId of sortedMissionIds) {
                console.log(`\n准备执行任务: ${missionId}`);
                
                try {
                    switch(missionId) {
                        case 'kiteai-mission-onboarding-1':
                            console.log('执行新手任务...');
                            await completeOnboarding();
                            await new Promise(resolve => setTimeout(resolve, 100));
                            break;
                            
                        case 'kiteai-mission-tutorial-1':
                            console.log('执行教程任务...');
                            await forwardLink(missionId);
                            await new Promise(resolve => setTimeout(resolve, 100));
                            break;
                            
                        case 'kiteai-mission-social-3':
                            console.log('执行 Telegram 任务...');
                            await completeSocialMediaTasks(missionId);
                            await new Promise(resolve => setTimeout(resolve, 100));
                            break;
                    }

                    const currentStatus = await getStatus();
                    logSection(`任务完成后状态`, {
                        xp: currentStatus.payload.userXp,
                        totalQuestsDone: currentStatus.payload.doneMissions ? 
                            currentStatus.payload.doneMissions.split(';').length : 0,
                        doneMissions: currentStatus.payload.doneMissions ? 
                            currentStatus.payload.doneMissions.split(';') : []
                    });
                    
                    const delay = 100;
                    console.log(`等待 ${Math.round(delay)}ms 后执行下一个任务...`);
                    await new Promise(resolve => setTimeout(resolve, delay));

                } catch (error) {
                    console.log(`执行任务 ${missionId} 失败: ${error.message}`);
                }
            }

            // 获取最终状态
            const finalStatus = await getStatus();

            // 计算总耗时
            const endTime = new Date();
            const duration = (endTime - startTime) / 1000;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);

            logSection('执行完成', {
                address: wallet.address,
                xp: finalStatus.payload.userXp,
                totalQuestsDone: finalStatus.payload.doneMissions ? 
                    finalStatus.payload.doneMissions.split(';').length : 0,
                duration: `${minutes}分${seconds}秒`
            });

            return {
                success: true,
                address: wallet.address,
                xp: finalStatus.payload.userXp,
                userId: finalStatus.payload.account.userId,
                duration: duration
            };
        } catch (error) {
            throw new Error(`API操作失败: ${error.message}`);
        }
    } catch (error) {
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        console.log('处理钱包时出错: ' + error.message);
        console.log(`失败时总耗时: ${Math.floor(duration / 60)}分${Math.floor(duration % 60)}秒`);
        return {
            success: false,
            error: error.message,
            duration: duration
        };
    }
}

// 主函数 - 修改为接收钱包数据参数
async function main(walletData, args = {}) {
    try {
        console.log('开始执行 KiteAI 自动化任务...');
        console.log(`当前时间: ${getFormattedLocalTime()}`);
        console.log('接收到的钱包数据:', JSON.stringify(walletData, null, 2));
        
        // 检查是否有加载的钱包
        let wallets = [];
        
        if (walletData && Array.isArray(walletData.wallets)) {
            wallets = walletData.wallets;
            console.log(`从walletData.wallets获取到${wallets.length}个钱包`);
        } else if (walletData && Array.isArray(walletData)) {
            wallets = walletData;
            console.log(`直接从walletData获取到${wallets.length}个钱包`);
        } else {
            console.log('钱包数据格式不正确:', walletData);
            throw new Error('没有找到要处理的钱包，请先加载钱包文件');
        }

        if (wallets.length === 0) {
            throw new Error('钱包列表为空，请确保钱包文件包含有效的钱包数据');
        }

        console.log(`找到 ${wallets.length} 个钱包待处理`);
        console.log('第一个钱包示例:', JSON.stringify(wallets[0], null, 2));

        // 处理每个钱包
        const results = [];
        for (let i = 0; i < wallets.length; i++) {
            console.log(`\n处理第 ${i + 1}/${wallets.length} 个钱包`);
            const result = await processWallet(wallets[i]);
            results.push(result);
            
            // 添加延迟
            if (i < wallets.length - 1) {
                const delay = Math.floor(Math.random() * 1000) + 500; // 500-1500ms
                console.log(`等待 ${delay}ms 后处理下一个钱包...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        console.log('\n✅ 所有操作已完成!');
        return {
            success: true,
            results: results
        };
    } catch (error) {
        console.log('主程序错误: ' + error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// 单个钱包测试函数
async function testSingleWallet(walletData, args = {}) {
    try {
        console.log('开始测试单个钱包...');
        console.log(`当前时间: ${getFormattedLocalTime()}`);
        console.log('接收到的钱包数据:', JSON.stringify(walletData, null, 2));
        
        // 检查是否有加载的钱包
        let wallet = null;
        
        if (walletData && Array.isArray(walletData.wallets) && walletData.wallets[0]) {
            wallet = walletData.wallets[0];
            console.log('从walletData.wallets获取第一个钱包');
        } else if (walletData && Array.isArray(walletData) && walletData[0]) {
            wallet = walletData[0];
            console.log('直接从walletData数组获取第一个钱包');
        } else if (walletData && walletData.address && walletData.privateKey) {
            wallet = walletData;
            console.log('直接使用walletData作为钱包对象');
        } else {
            console.log('钱包数据格式不正确:', walletData);
            throw new Error('没有找到要处理的钱包，请先加载钱包文件');
        }

        console.log(`处理钱包: ${wallet.address}`);
        
        const result = await processWallet(wallet);
        
        console.log('\n✅ 测试完成!');
        return {
            success: true,
            result: result
        };
    } catch (error) {
        console.log('测试单个钱包错误: ' + error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// 简单测试函数，不需要钱包数据
async function testBasic(walletData, args = {}) {
    try {
        console.log('开始基本功能测试...');
        console.log(`当前时间: ${getFormattedLocalTime()}`);
        console.log('接收到的参数:', JSON.stringify(args, null, 2));
        
        // 测试日志函数
        logSection('测试日志', {
            message: '这是一个测试日志',
            timestamp: getFormattedLocalTime(),
            args: args
        });
        
        // 测试延迟函数
        console.log('测试延迟函数...');
        const delay = 1000;
        console.log(`等待 ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log('延迟结束');
        
        return {
            success: true,
            message: '基本功能测试成功',
            timestamp: getFormattedLocalTime()
        };
    } catch (error) {
        console.log('基本功能测试错误: ' + error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// 导出函数
module.exports = {
    main
}
