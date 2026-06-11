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

// 🎯 [🔒 ওস্তাদ! আপনার টাইপ করা ৪-স্তর অফিশিয়াল ওOdds মাল্টিপ্লায়ার সিঁড়ি ১ শতভাগ খাঁটি লক ফায়ার 🔒]
const chickenRoadMultiRiskLadders = {
    "Easy": [
        1.02, 1.08, 1.14, 1.21, 1.29, 1.37, 1.46, 1.56, 1.67, 1.80, 
        1.94, 2.09, 2.27, 2.47, 2.69, 2.95, 3.24, 3.58, 3.98, 4.45, 
        5.01, 5.68, 6.49, 7.49, 8.74, 10.33, 12.39, 15.15, 18.94, 24.35
    ],
    "Medium": [
        1.08, 1.22, 1.38, 1.57, 1.79, 2.06, 2.38, 2.78, 3.27, 3.89, 
        4.67, 5.67, 6.98, 8.73, 11.11, 14.44, 19.25, 26.48, 37.83, 56.74, 
        90.79, 158.88, 317.77, 794.43, 3177.72
    ],
    "Hard": [
        1.19, 1.47, 1.84, 2.32, 2.97, 3.84, 5.05, 6.73, 9.13, 12.65, 
        17.92, 26.07, 39.11, 60.84, 98.87, 169.49, 310.74, 621.49, 1398.35, 3728.95
    ],
    "Hardcore": [
        1.45, 2.22, 3.47, 5.56, 9.13, 15.46, 27.06, 49.21, 93.50, 187.01, 
        397.39, 908.33, 2270.83, 6358.35, 20664.00
    ]
};

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
    const reqAmount = parseFloat(amount) || 5000.00; // আপনার স্ক্রিনশটের ৫০০০৳ বেট লক ওস্তাদ!
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

    // 🔒 [🔒 সিলেক্টেড রিস্ক লেভেল অনুযায়ী লেনের সংখ্যা ওOdds সিঁড়ি ডাইনামিক ফিল্টারিং 🔒]
    let activeLadder = chickenRoadMultiRiskLadders[activeRisk] || chickenRoadMultiRiskLadders["Easy"];
    let totalLanesCount = activeLadder.length;
    let secureLanesConfig = [];
    
    let dangerProbability = activeRisk === "Easy" ? 0.08 : (activeRisk === "Medium" ? 0.18 : (activeRisk === "Hard" ? 0.28 : 0.38));

    for (let i = 0; i < totalLanesCount; i++) {
        let isLaneDanger = Math.random() <= dangerProbability ? 1 : 0;
        if (i === 0 || i === (totalLanesCount - 1)) isLaneDanger = 0;
        secureLanesConfig.push(isLaneDanger);
    }

    chickenRoadActiveSessionsMap[finalQueryUser] = {
        betAmount: reqAmount,
        risk: activeRisk,
        wallet: targetWallet,
        lanesConfig: secureLanesConfig,
        currentLaneIndex: -1, 
        accumulatedMultiplier: 1.00,
        isGameOver: false
    };

    return res.json({
        success: true,
        balance: currentDbBalance,
        message: "🐓 Chicken Road Live! Jump on the lane!",
        session: {
            currentLane: -1,
            nextMultiplier: activeLadder
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
    let activeLadder = chickenRoadMultiRiskLadders[activeSession.risk];

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

        delete chickenRoadActiveSessionsMap[finalQueryUser]; 

        return res.json({
            success: true,
            status: "CRASH",
            balance: finalBal,
            message: "💥 SPLAT! Chicken collided with a speeding vehicle!",
            crashAtLane: targetIndex
        });
    }

    let nextOdds = activeLadder[targetIndex];
    activeSession.accumulatedMultiplier = nextOdds;

    let isLastLaneReached = (targetIndex === totalConfig.length - 1);

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

    return res.json({
        success: true,
        status: "SAFE",
        currentLane: targetIndex,
        currentMultiplier: nextOdds,
        nextMultiplier: activeLadder[targetIndex + 1],
        message: "🟢 Safe step! Keep moving forward!"
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
});

app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname, 'index.html')); });
io.on('connection', (socket) => {});

// ⚡ [🔒 পোর্ট ৯৯৯৯ কড়া লক বর্ম 🔒]: ওস্তাদ! আপনার কম্যান্ড অনুযায়ী অফিশিয়াল পোর্ট ৯৯৯৯ কড়া লক ফায়ার!
const PORT = process.env.PORT || 9999; 
server.listen(PORT, () => { console.log(`🐓 Chicken Road Official Dynamic Vector Casino Platform Active on port 9999`); });


