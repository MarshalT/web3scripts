const fetch = require('node-fetch');
const chalk = require('chalk');
const fs = require('fs/promises');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const path = require('path');
// ... existing code ...

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

const waitForKeyPress = async () => {
    process.stdin.setRawMode(true);
    return new Promise(resolve => {
        process.stdin.once('data', () => {
            process.stdin.setRawMode(false);
            resolve();
        });
    });
};

// 添加获取数据目录路径的函数
function getDataPath() {
    if (process.pkg) {
        return path.join(path.dirname(process.execPath), 'data');
    }
    return __dirname;
}
async function loadWallets() {
    try {
        const dataPath = getDataPath();
        const addressesDir = path.join(dataPath, 'kiteai_addresses');
        
        // 确保地址目录存在
        await fs.mkdir(addressesDir, { recursive: true });
        
        // 读取目录中的所有文件
        const files = await fs.readdir(addressesDir);
        
        // 过滤出地址文件
        const addressFiles = files.filter(file => file.startsWith('addresses_'));
            
        if (addressFiles.length === 0) {
            throw new Error('没有找到地址文件，请确保在 addresses 目录中存在 addresses_ 开头的文件');
        }
        
        // 读取所有文件并合并地址
        const allWallets = new Set();
        for (const fileName of addressFiles) {
            const filePath = path.join(addressesDir, fileName);
            console.log(`${chalk.cyan('📂 正在读取文件:')} ${chalk.green(fileName)}`);
            
            const data = await fs.readFile(filePath, 'utf8');
            const wallets = data.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
                
            wallets.forEach(wallet => allWallets.add(wallet));
        }
        
        const uniqueWallets = Array.from(allWallets);
        
        if (uniqueWallets.length === 0) {
            throw new Error('没有在地址文件中找到任何钱包地址');
        }
        
        console.log(`${chalk.cyan('📊 总共找到钱包地址:')} ${chalk.green(uniqueWallets.length)} ${chalk.cyan('个')}`);
        console.log(`${chalk.cyan('📁 来自文件数量:')} ${chalk.green(addressFiles.length)} ${chalk.cyan('个')}`);
        
        return uniqueWallets;
    } catch (err) {
        console.log(`${chalk.red('[ERROR]')} 读取钱包文件错误: ${err.message}`);
        process.exit(1);
    }
}

// 加载代理列表
async function loadProxies() {
    try {
        const data = await fs.readFile('proxies.txt', 'utf8');
        return data.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(proxy => {
                if (proxy.includes('://')) {
                    const url = new URL(proxy);
                    return {
                        protocol: url.protocol.replace(':', ''),
                        host: url.hostname,
                        port: url.port,
                        auth: url.username ? `${url.username}:${url.password}` : ''
                    };
                } else {
                    const [protocol, host, port, user, pass] = proxy.split(':');
                    return {
                        protocol: protocol.replace('//', ''),
                        host,
                        port,
                        auth: user && pass ? `${user}:${pass}` : ''
                    };
                }
            });
    } catch (err) {
        logSection('代理加载', '未找到代理文件或读取错误，使用直连模式');
        return [];
    }
}

function createAgent(proxy) {
    if (!proxy) return null;
    
    const { protocol, host, port, auth } = proxy;
    const authString = auth ? `${auth}@` : '';
    const proxyUrl = `${protocol}://${authString}${host}:${port}`;
    
    return protocol.startsWith('socks') 
        ? new SocksProxyAgent(proxyUrl)
        : new HttpsProxyAgent(proxyUrl);
}

const AI_ENDPOINTS = {
    "https://deployment-uu9y1z4z85rapgwkss1muuiz.stag-vxzy.zettablock.com/main": {
        "agent_id": "deployment_UU9y1Z4Z85RAPGwkss1mUUiZ",
        "name": "Kite AI Assistant",
        "questions": [
            "Tell me about the latest updates in Kite AI",
            "What are the upcoming features in Kite AI?",
            "How can Kite AI improve my development workflow?",
            "What makes Kite AI unique in the market?",
            "How does Kite AI handle code completion?",
            "Can you explain Kite AI's machine learning capabilities?",
            "What programming languages does Kite AI support best?",
            "How does Kite AI integrate with different IDEs?",
            "What are the advanced features of Kite AI?",
            "How can I optimize my use of Kite AI?"
        ]
    },
    "https://deployment-ecz5o55dh0dbqagkut47kzyc.stag-vxzy.zettablock.com/main": {
        "agent_id": "deployment_ECz5O55dH0dBQaGKuT47kzYC",
        "name": "Crypto Price Assistant",
        "questions": [
            "What's the current market sentiment for Solana?",
            "Analyze Bitcoin's price movement in the last hour",
            "Compare ETH and BTC performance today",
            "Which altcoins are showing bullish patterns?",
            "Market analysis for top 10 cryptocurrencies",
            "Technical analysis for Polkadot",
            "Price movement patterns for Avalanche",
            "Polygon's market performance analysis",
            "Latest developments affecting BNB price",
            "Cardano's market outlook"
        ]
    },
    "https://deployment-sofftlsf9z4fya3qchykaanq.stag-vxzy.zettablock.com/main": {
        "agent_id": "deployment_SoFftlsf9z4fyA3QCHYkaANq",
        "name": "Transaction Analyzer",
        "questions": []
    }
};

class WalletStatistics {
    constructor() {
        this.agentInteractions = {};
        for (const endpoint in AI_ENDPOINTS) {
            this.agentInteractions[AI_ENDPOINTS[endpoint].name] = 0;
        }
        this.totalPoints = 0;
        this.totalInteractions = 0;
        this.lastInteractionTime = null;
        this.successfulInteractions = 0;
        this.failedInteractions = 0;
    }
}

class WalletSession {
    constructor(walletAddress, sessionId) {
        this.walletAddress = walletAddress;
        this.sessionId = sessionId;
        this.dailyPoints = 0;
        this.startTime = new Date();
        this.nextResetTime = new Date(this.startTime.getTime() + 24 * 60 * 60 * 1000);
        this.statistics = new WalletStatistics();
    }

    updateStatistics(agentName, success = true) {
        this.statistics.agentInteractions[agentName]++;
        this.statistics.totalInteractions++;
        this.statistics.lastInteractionTime = new Date();
        if (success) {
            this.statistics.successfulInteractions++;
            this.statistics.totalPoints += 10; // Points per successful interaction
        } else {
            this.statistics.failedInteractions++;
        }
    }

    printStatistics() {
        console.log(`\n${chalk.blue(`[Session ${this.sessionId}]`)} ${chalk.green(`[${this.walletAddress}]`)} ${chalk.cyan('📊 Current Statistics')}`);
        console.log(`${chalk.yellow('════════════════════════════════════════════')}`);
        console.log(`${chalk.cyan('💰 Total Points:')} ${chalk.green(this.statistics.totalPoints)}`);
        console.log(`${chalk.cyan('🔄 Total Interactions:')} ${chalk.green(this.statistics.totalInteractions)}`);
        console.log(`${chalk.cyan('✅ Successful:')} ${chalk.green(this.statistics.successfulInteractions)}`);
        console.log(`${chalk.cyan('❌ Failed:')} ${chalk.red(this.statistics.failedInteractions)}`);
        console.log(`${chalk.cyan('⏱️ Last Interaction:')} ${chalk.yellow(this.statistics.lastInteractionTime?.toISOString() || 'Never')}`);
        
        console.log(`\n${chalk.cyan('🤖 Agent Interactions:')}`);
        for (const [agentName, count] of Object.entries(this.statistics.agentInteractions)) {
            console.log(`   ${chalk.yellow(agentName)}: ${chalk.green(count)}`);
        }
        console.log(chalk.yellow('════════════════════════════════════════════\n'));
    }
}

class KiteAIAutomation {
    constructor(wallet, proxyList = [], sessionId) {
        // 处理钱包地址格式
        const walletAddress = typeof wallet === 'string' ? wallet : wallet.address;
        if (!walletAddress) {
            throw new Error('Invalid wallet address');
        }

        this.session = new WalletSession(walletAddress, sessionId);
        this.proxyList = proxyList;
        this.currentProxyIndex = 0;
        this.MAX_DAILY_POINTS = 200;
        this.POINTS_PER_INTERACTION = 10;
        this.MAX_DAILY_INTERACTIONS = this.MAX_DAILY_POINTS / this.POINTS_PER_INTERACTION;
        this.isRunning = true;
        this.isCompleted = false;
    }

    getCurrentProxy() {
        if (this.proxyList.length === 0) return null;
        return this.proxyList[this.currentProxyIndex];
    }

    rotateProxy() {
        if (this.proxyList.length === 0) return null;
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
        const proxy = this.getCurrentProxy();
        this.logMessage('🔄', `Rotating to proxy: ${proxy.protocol}://${proxy.host}:${proxy.port}`, 'cyan');
        return proxy;
    }

    logMessage(emoji, message, color = 'white') {
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const sessionPrefix = chalk.blue(`[Session ${this.session.sessionId}]`);
        const walletPrefix = chalk.green(`[${this.session.walletAddress.slice(0, 6)}...]`);
        console.log(`${chalk.yellow(`[${timestamp}]`)} ${sessionPrefix} ${walletPrefix} ${chalk[color](`${emoji} ${message}`)}`);
    }

    resetDailyPoints() {
        const currentTime = new Date();
        if (currentTime >= this.session.nextResetTime) {
            this.logMessage('✨', 'Starting new 24-hour reward period', 'green');
            this.session.dailyPoints = 0;
            this.session.nextResetTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
            return true;
        }
        return false;
    }

    async shouldWaitForNextReset() {
        if (this.session.dailyPoints >= this.MAX_DAILY_POINTS) {
            this.logMessage('🎯', `Maximum daily points (${this.MAX_DAILY_POINTS}) reached`, 'yellow');
            this.logMessage('⏳', `Next reset: ${this.session.nextResetTime.toISOString().replace('T', ' ').slice(0, 19)}`, 'yellow');
            this.isCompleted = true;
            this.stop();
            return true;
        }
        return false;
    }

    async getRecentTransactions() {
        this.logMessage('🔍', 'Scanning recent transactions...', 'white');
        const url = 'https://testnet.kitescan.ai/api/v2/advanced-filters';
        const params = new URLSearchParams({
            transaction_types: 'coin_transfer',
            age: '5m'
        });

        try {
            const agent = createAgent(this.getCurrentProxy());
            const response = await fetch(`${url}?${params}`, {
                agent,
                headers: {
                    'accept': '*/*',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const data = await response.json();
            const hashes = data.items?.map(item => item.hash) || [];
            this.logMessage('📊', `Found ${hashes.length} recent transactions`, 'magenta');
            return hashes;
        } catch (e) {
            this.logMessage('❌', `Transaction fetch error: ${e}`, 'red');
            this.rotateProxy();
            return [];
        }
    }

    async sendAiQuery(endpoint, message) {
        const agent = createAgent(this.getCurrentProxy());
        const headers = {
            'Accept': 'text/event-stream',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        const data = {
            message,
            stream: true
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                agent,
                headers,
                body: JSON.stringify(data)
            });

            const sessionPrefix = chalk.blue(`[Session ${this.session.sessionId}]`);
            const walletPrefix = chalk.green(`[${this.session.walletAddress.slice(0, 6)}...]`);
            process.stdout.write(`${sessionPrefix} ${walletPrefix} ${chalk.cyan('🤖 AI Response: ')}`);
            
            let accumulatedResponse = "";

            for await (const chunk of response.body) {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6);
                            if (jsonStr === '[DONE]') break;

                            const jsonData = JSON.parse(jsonStr);
                            const content = jsonData.choices?.[0]?.delta?.content || '';
                            if (content) {
                                accumulatedResponse += content;
                                process.stdout.write(chalk.magenta(content));
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                }
            }
            console.log();
            return accumulatedResponse.trim();
        } catch (e) {
            this.logMessage('❌', `AI query error: ${e}`, 'red');
            this.rotateProxy();
            return "";
        }
    }

    async reportUsage(endpoint, message, response) {
        this.logMessage('📝', 'Recording interaction...', 'white');
        const url = 'https://quests-usage-dev.prod.zettablock.com/api/report_usage';
        const data = {
            wallet_address: this.session.walletAddress,
            agent_id: AI_ENDPOINTS[endpoint].agent_id,
            request_text: message,
            response_text: response,
            request_metadata: {}
        };

        try {
            const agent = createAgent(this.getCurrentProxy());
            const result = await fetch(url, {
                method: 'POST',
                agent,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: JSON.stringify(data)
            });
            return result.status === 200;
        } catch (e) {
            this.logMessage('❌', `Usage report error: ${e}`, 'red');
            this.rotateProxy();
            return false;
        }
    }

    async run() {
        this.logMessage('🚀', 'Initializing Kite AI Auto-Interaction System', 'green');
        this.logMessage('💼', `Wallet: ${this.session.walletAddress}`, 'cyan');
        this.logMessage('🎯', `Daily Target: ${this.MAX_DAILY_POINTS} points (${this.MAX_DAILY_INTERACTIONS} interactions)`, 'cyan');
        this.logMessage('⏰', `Next Reset: ${this.session.nextResetTime.toISOString().replace('T', ' ').slice(0, 19)}`, 'cyan');
        
        if (this.proxyList.length > 0) {
            this.logMessage('🌐', `Loaded ${this.proxyList.length} proxies`, 'cyan');
        } else {
            this.logMessage('🌐', 'Running in direct connection mode', 'yellow');
        }

        let interactionCount = 0;
        try {
            while (this.isRunning) {
                this.resetDailyPoints();
                await this.shouldWaitForNextReset();

                interactionCount++;
                console.log(`\n${chalk.blue(`[Session ${this.session.sessionId}]`)} ${chalk.green(`[${this.session.walletAddress}]`)} ${chalk.cyan('═'.repeat(60))}`);
                this.logMessage('🔄', `Interaction #${interactionCount}`, 'magenta');
                this.logMessage('📈', `Progress: ${this.session.dailyPoints + this.POINTS_PER_INTERACTION}/${this.MAX_DAILY_POINTS} points`, 'cyan');
                this.logMessage('⏳', `Next Reset: ${this.session.nextResetTime.toISOString().replace('T', ' ').slice(0, 19)}`, 'cyan');

                const transactions = await this.getRecentTransactions();
                AI_ENDPOINTS["https://deployment-sofftlsf9z4fya3qchykaanq.stag-vxzy.zettablock.com/main"].questions = 
                    transactions.map(tx => `Analyze this transaction in detail: ${tx}`);

                const endpoints = Object.keys(AI_ENDPOINTS);
                const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
                const questions = AI_ENDPOINTS[endpoint].questions;
                const question = questions[Math.floor(Math.random() * questions.length)];

                this.logMessage('🤖', `AI System: ${AI_ENDPOINTS[endpoint].name}`, 'cyan');
                this.logMessage('🔑', `Agent ID: ${AI_ENDPOINTS[endpoint].agent_id}`, 'cyan');
                this.logMessage('❓', `Query: ${question}`, 'cyan');

                const response = await this.sendAiQuery(endpoint, question);
                let interactionSuccess = false;

                if (await this.reportUsage(endpoint, question, response)) {
                    this.logMessage('✅', 'Interaction successfully recorded', 'green');
                    this.session.dailyPoints += this.POINTS_PER_INTERACTION;
                    interactionSuccess = true;
                } else {
                    this.logMessage('⚠️', 'Interaction recording failed', 'red');
                }

                // Update statistics for this interaction
                this.session.updateStatistics(AI_ENDPOINTS[endpoint].name, interactionSuccess);
                
                // Display current statistics after each interaction
                this.session.printStatistics();

                const delay = Math.random() * 2 + 1;
                this.logMessage('⏳', `Cooldown: ${delay.toFixed(1)} seconds...`, 'yellow');
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                this.logMessage('🛑', 'Process terminated by user', 'yellow');
            } else {
                this.logMessage('❌', `Error: ${e}`, 'red');
            }
        }
    }

    stop() {
        this.isRunning = false;
    }
}

// 主函数
async function main(wallets, args = {}) {
    try {
        logSection('KiteAI 自动化工具', `启动时间: ${getFormattedLocalTime()}`);

        // 验证钱包数据
        if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
            throw new Error('无效的钱包数据');
        }

        // 加载代理
        const proxyList = await loadProxies();
        
        logSection('初始化信息', {
            钱包数量: wallets.length,
            代理数量: proxyList.length || '直连模式'
        });

        // 创建实例
        const instances = wallets.map((wallet, index) => {
            if (!wallet || (!wallet.address && typeof wallet !== 'string')) {
                throw new Error(`钱包 #${index + 1} 格式无效`);
            }
            return new KiteAIAutomation(wallet, proxyList, index + 1);
        });

        logSection('启动会话', '开始处理所有钱包');

        // 运行所有实例并等待完成
        try {
            const promises = instances.map(instance => instance.run());
            
            // 定期检查是否所有实例都完成
            while (true) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 每秒检查一次
                
                if (instances.every(instance => instance.isCompleted)) {
                    logSection('任务完成', '所有钱包已完成日常任务');
                    process.exit(0); // 正常退出程序
                    break;
                }
            }
            
            return { success: true };
        } catch (error) {
            throw new Error(`运行失败: ${error.message}`);
        }
    } catch (error) {
        logSection('错误', error.message);
        return { success: false, error: error.message };
    }
}

// 进程终止处理
process.on('SIGINT', () => {
    logSection('系统通知', '正在gracefully关闭程序...');
    process.exit(0);
});

// 全局错误处理
process.on('unhandledRejection', (error) => {
    logSection('未处理的异常', error.message);
});

// 导出函数
module.exports = {
    main
};
