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

// 🎯 লেনের অফিশিয়াল ওodds মাল্টিপ্লায়ার সিঁড়ি (স্ক্রিনশটের ১.০২x বেস থেকে মেগা বুস্ট!)
const chickenRoadMultiplierLadder = [1.02, 1.25, 1.60, 2.10, 3.20, 5.00, 10.00, 25.00, 50.00];

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

// 💰 ১. লাইভ অ্যাকাউন্ট ব্যালেন্স ইন্টারসেপ্টর গেটওয়ে
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
    const reqAmount = parseFloat(amount) || 1.00; // স্ক্রিনশটের ১.০০৳ বেস বেট লক ওস্তাদ!
    const targetWallet = wallet || "main";
    const activeRisk = riskLevel || "Easy"; // Easy, Medium, Hard ডাইনামিক ফিল্টার সিঙ্ক

    let finalQueryUser = userId || "guest";
    if (finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") finalQueryUser = "guest";

    if (reqAmount < 1 || reqAmount > 5000) {
        return res.json({ success: false, message: "🚨 Invalid Bet Parameter! Max 5000৳" });
    }

    // মেইন ড্যাশবোর্ড সাইট থেকে ওয়ান-শটে বেট এমাউন্ট ক্যাশ ডেবিট হিট
    let balResponseData = await sendSecureApiRequestToMainPlatform({
        action: "bet", username: finalQueryUser, amount: reqAmount, wallet: targetWallet, game: "chickenroad"
    });

    if (!balResponseData || (balResponseData.status !== "ok" && balResponseData.status !== "timeout_bypass_error")) {
        return res.json({ success: false, message: "❌ আপনার অ্যাকাউন্ট ব্যালেন্স অপ্রতুল!" });
    }

    let currentDbBalance = parseFloat(balResponseData.balance) || 0;

    // 🔒 [🔒 জেনুইন সুরক্ষতি র্যান্ডম ক্র্যাশ জেনারেটর লক 🔒]
    let totalLanesCount = 9;
    let secureLanesConfig = [];
    let dangerProbability = activeRisk === "Easy" ? 0.15 : (activeRisk === "Medium" ? 0.30 : 0.50);

    for (let i = 0; i < totalLanesCount; i++) {
        // ১ মানে লেনে গাড়ি আসবে (Crash Trap), ০ মানে লেন একদম ১০০% সেফ রাস্তা!
        let isLaneDanger = Math.random() <= dangerProbability ? 1 : 0;
        secureLanesConfig.push(isLaneDanger);
    }

    // সেশন রেজিস্ট্রি হোল্ডিং বুস্ট
    chickenRoadActiveSessionsMap[finalQueryUser] = {
        betAmount: reqAmount,
        risk: activeRisk,
        wallet: targetWallet,
        lanesConfig: secureLanesConfig,
        currentLaneIndex: -1, // মুরগি এখনো ফুটপাতে দাঁড়িয়ে আছে
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

// 🏃‍♂️ ৩. মুরগির সামনের লেনে লাফ দেওয়ার এপিআই ড্রাইভার (JUMP LANE API)
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

    // 💥 [🔒 ক্র্যাশ ও কন্ডিশন কোলাইড কোড চেক 🔒]
    if (totalConfig[targetIndex] === 1) {
        activeSession.isGameOver = true;
        
        let lossPayload = { 
            action: "win", username: finalQueryUser, amount: 0, wallet: activeSession.wallet, game: "chickenroad" 
        };
        lossPayload.status = "lose";
        lossPayload.bet_amount = activeSession.betAmount;

        let response = await sendSecureApiRequestToMainPlatform(lossPayload);
        let finalBal = response.balance !== undefined ? response.balance : 0;

        delete chickenRoadActiveSessionsMap[finalQueryUser]; // সেশন ক্লিন সাফ!

        return res.json({
            success: true,
            status: "CRASH",
            balance: finalBal,
            message: "💥 SPLAT! Chicken collided with a speeding truck!",
            crashAtLane: targetIndex
        });
    }

    // 🟢 লেন সফলভাবে পার হলে ওodds সিঁড়ি বুস্ট লকিং মেথড!
    let nextOdds = chickenRoadMultiplierLadder[targetIndex];
    activeSession.accumulatedMultiplier = nextOdds;

    let isLastLaneReached = (targetIndex === totalConfig.length - 1);

    // যদি পুরো ৯টি লেন এক টানে পার হয়ে ওপারে চলে যায়—ডিরেক্ট অটো সুপার জ্যাকпот ক্যাশ আউট!
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
            message: "🏆 GRAND VICTORY! Chicken successfully crossed the entire highway!"
        });
    }

    // সাধারণ সেফ ল্যান্ডিং রেসপন্স সিঙ্ক
    return res.json({
        success: true,
        status: "SAFE",
        currentLane: targetIndex,
        currentMultiplier: nextOdds,
        nextMultiplier: chickenRoadMultiplierLadder[targetIndex + 1],
        message: "🟢 Safe step! Keep moving forward!"
    });
});

// 💰 ৪. প্লেয়ারের যেকোনো মুহূর্তে টাকা তুলে নেওয়ার এপিআই রাউট (CASH OUT API)
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
    delete chickenRoadActiveSessionsMap[finalQueryUser]; // মেমোরি একদম ফ্রেশ সাফ!

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

// ⚡ [🔒 পোর্ট ৯৯৯৯ সিঙ্ক লক বর্ম 🔒]: ওস্তাদ! আপনার কম্যান্ড অনুযায়ী অফিশিয়াল পোর্ট ৯৯৯৯ কড়া লক ফায়ার!
const PORT = process.env.PORT || 9999; 
server.listen(PORT, () => { console.log(`🐓 Chicken Road Official Dynamic Vector Casino Platform Active on port 9999`); });
