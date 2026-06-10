const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

// ✅ মেইন প্ল্যাটফর্ম এপিআই ডোমেইন লিঙ্ক গেটওয়ে লক
const MAIN_SITE_URL = "https://betlover247.onrender.com"; 

// 🐓 চিকেন রোড প্লেয়ার একটিভ সেশন ডাটাবেজ মেমোরি
let chickenRoadActiveSessionsMap = {};

// 🎯 মেগা ১০টি লেনের অফিশিয়াল ওodds মাল্টিপ্লায়ার সিঁড়ি (মুরগি যত ডানে যাবে তত ওOdds বিস্ফোরণ ঘটবে ওস্তাদ!)
const chickenRoadMultiplierLadder = [1.02, 1.25, 1.60, 2.10, 3.20, 5.00, 8.50, 15.00, 30.00, 60.00];

// হেল্পার ফাংশন: মেইন সাইটের এপিআই প্রসেসিং জ্যাম দূর করার জন্য কিলার আক্সিওস ক্লায়েন্ট প্রোটোকল
async function sendSecureApiRequestToMainPlatform(payload) {
    try {
        const res = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, payload, {
            timeout: 30000, 
            headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
        });
        return res.data;
    } catch (err) {
        return { status: "timeout_bypass_error", balance: 0 };
    }
}

// 💰 ১. লাইভ অ্যাকাউন্ট ব্যালেন্স ইন্টারсеপ্টর গেটওয়ে
app.get('/api/slot-balance', async (req, res) => {
    const { userId, wallet } = req.query;
    const targetWallet = wallet || "main";
    let finalUser = userId === "logged_in_player" || !userId || userId === "undefined" ? "guest" : userId;
    
    let responseData = await sendSecureApiRequestToMainPlatform({
        action: "balance", username: finalUser, amount: 0, wallet: targetWallet, game: "chickenroad"
    });
    
    if (responseData && (responseData.status === "ok" || responseData.status === "timeout_bypass_error")) {
        return res.json({ success: true, balance: responseData.balance || 0 });
    }
    return res.json({ success: false, balance: 0 });
});

// 🛫 ২. চিকেন রোড বাজি ধরা ইঞ্জিন রাউট (START GAME API)
app.post('/api/chicken-bet', async (req, res) => {
    const { userId, amount, wallet, riskLevel } = req.body; 
    const reqAmount = parseFloat(amount) || 1.00; 
    const targetWallet = wallet || "main";
    const activeRisk = riskLevel || "Easy"; 

    let finalQueryUser = userId || "guest";
    if (finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") finalQueryUser = "guest";

    if (reqAmount < 1 || reqAmount > 5000) {
        return res.json({ success: false, message: "🚨 Invalid Bet Parameter! Max 5000৳" });
    }

    let balResponseData = await sendSecureApiRequestToMainPlatform({
        action: "bet", username: finalQueryUser, amount: reqAmount, wallet: targetWallet, game: "chickenroad"
    });

    if (!balResponseData || (balResponseData.status !== "ok" && balResponseData.status !== "timeout_bypass_error")) {
        return res.json({ success: false, message: "❌ আপনার অ্যাকাউন্ট ব্যালেন্স অপ্রতুল!" });
    }

    let currentDbBalance = parseFloat(balResponseData.balance) || 0;

    // 🔒 [🔒 মেগা ১০টি লেনের সিক্রেট ট্রাফিক জ্যাম কনফিগারেশন লক 🔒]
    let totalLanesCount = 10;
    let secureLanesConfig = [];
    let dangerProbability = activeRisk === "Easy" ? 0.15 : (activeRisk === "Medium" ? 0.28 : 0.45);

    for (let i = 0; i < totalLanesCount; i++) {
        let isLaneDanger = Math.random() <= dangerProbability ? 1 : 0;
        secureLanesConfig.push(isLaneDanger);
    }

    chickenRoadActiveSessionsMap[finalQueryUser] = {
        betAmount: reqAmount,
        risk: activeRisk,
        wallet: targetWallet,
        lanesConfig: secureLanesConfig,
        currentLaneIndex: -1, // মুরগি একদম বামের শুরুর ফুটপাতে দাঁড়িয়ে আছে ওস্তাদ
        accumulatedMultiplier: 1.00,
        isGameOver: false
    };

    return res.json({
        success: true,
        balance: currentDbBalance,
        message: "🐓 Chicken Road Live! Jump on the lane!",
        session: {
            currentLane: -1,
            nextMultiplier: chickenRoadMultiplierLadder
        }
    });
});

// 🏃‍♂️ ৩. মুরগির সামনের লেনে (বাম থেকে ডানে) লাফ দেওয়ার এপিআই ড্রাইভার (JUMP LANE API)
app.post('/api/chicken-jump', async (req, res) => {
    const { userId } = req.body;
    let finalQueryUser = userId || "guest";
    if (finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") finalQueryUser = "guest";

    let activeSession = chickenRoadActiveSessionsMap[finalQueryUser];

    if (!activeSession || activeSession.isGameOver) {
        return res.json({ success: false, message: "🚨 No Active Session Found! Place Bet First." });
    }

    activeSession.currentLaneIndex++;
    let targetIndex = activeSession.currentLaneIndex;
    let totalConfig = activeSession.lanesConfig;

    // 💥 [🔒 ক্র্যাশ ও উপর-নিচ কোলাইড কোড চেক 🔒]
    if (totalConfig[targetIndex] === 1) {
        activeSession.isGameOver = true;
        
        let lossPayload = { 
            action: "win", username: finalQueryUser, amount: 0, wallet: activeSession.wallet, game: "chickenroad" 
        };
        lossPayload.status = "lose";
        lossPayload.bet_amount = activeSession.betAmount;

        let response = await sendSecureApiRequestToMainPlatform(lossPayload);
        let finalBal = response.balance !== undefined ? response.balance : 0;

        delete chickenRoadActiveSessionsMap[finalQueryUser]; 

        return res.json({
            success: true,
            status: "CRASH",
            balance: finalBal,
            message: "💥 SPLAT! Chicken collided with a vertical speeding truck!",
            crashAtLane: targetIndex
        });
    }

    let nextOdds = chickenRoadMultiplierLadder[targetIndex];
    activeSession.accumulatedMultiplier = nextOdds;

    let isLastLaneReached = (targetIndex === totalConfig.length - 1);

    // যদি পুরো ১০টি লেন এক টানে পার হয়ে একদম ডানের সীমানায় চলে যায়—ডিরেক্ট অটো সুপার জ্যাকপট ক্যাশ আউট!
    if (isLastLaneReached) {
        activeSession.isGameOver = true;
        let finalJackpotCash = Math.round(activeSession.betAmount * nextOdds);

        let winPayload = {
            action: "win", username: finalQueryUser, amount: parseFloat(finalJackpotCash), wallet: activeSession.wallet, game: "chickenroad"
        };
        winPayload.status = "win";
        winPayload.bet_amount = 0;

        let response = await sendSecureApiRequestToMainPlatform(winPayload);
        delete chickenRoadActiveSessionsMap[finalQueryUser];

        return res.json({
            success: true,
            status: "JACKPOT",
            balance: response.balance || 0,
            winAmount: finalJackpotCash,
            multiplier: nextOdds,
            message: "🏆 GRAND VICTORY! Chicken successfully crossed all roads from Left to Right!"
        });
    }

    return res.json({
        success: true,
        status: "SAFE",
        currentLane: targetIndex,
        currentMultiplier: nextOdds,
        nextMultiplier: chickenRoadMultiplierLadder[targetIndex + 1],
        message: "🟢 Safe step! Keep moving right!"
    });
});

// 💰 ৪. প্লেয়ারের টাকা তুলে নেওয়ার এপিআই রাউট (CASH OUT API)
app.post('/api/chicken-cashout', async (req, res) => {
    const { userId } = req.body;
    let finalQueryUser = userId || "guest";
    if (finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") finalQueryUser = "guest";

    let activeSession = chickenRoadActiveSessionsMap[finalQueryUser];

    if (!activeSession || activeSession.isGameOver) {
        return res.json({ success: false, message: "🚨 No Active Win to Cash Out!" });
    }

    if (activeSession.currentLaneIndex === -1) {
        return res.json({ success: false, message: "❌ You must cross at least 1 lane to Cash Out!" });
    }

    activeSession.isGameOver = true;
    let finalCalculatedWin = Math.round(activeSession.betAmount * activeSession.accumulatedMultiplier);

    let cashOutPayload = {
        action: "win", username: finalQueryUser, amount: parseFloat(finalCalculatedWin), wallet: activeSession.wallet, game: "chickenroad"
    };
    cashOutPayload.status = "win";
    cashOutPayload.bet_amount = 0;

    let response = await sendSecureApiRequestToMainPlatform(cashOutPayload);
    let finalBal = response.balance !== undefined ? response.balance : 0;

    io.emit("balanceUpdate", { username: finalQueryUser, balance: finalBal });
    delete chickenRoadActiveSessionsMap[finalQueryUser]; 

    return res.json({
        success: true,
        status: "CASHOUT_SUCCESS",
        balance: finalBal,
        winAmount: finalCalculatedWin,
        multiplier: activeSession.accumulatedMultiplier,
        message: `🎉 Success! You cashed out Tk${finalCalculatedWin.toFixed(2)} safely!`
    });
});

app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname, 'index.html')); });
io.on('connection', (socket) => {});

// ⚡ কাস্টম নোড সার্ভার পোর্ট গেটওয়ে ৯৯৯৯ পোর্টে কড়া সিঙ্ক লক ওস্তাদ!
const PORT = process.env.PORT || 9999; 
server.listen(PORT, () => { console.log(`🐓 Chicken Road Official Left-to-Right Scrolling Platform Active on port 9999`); });
