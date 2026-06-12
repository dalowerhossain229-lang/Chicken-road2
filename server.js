const express = require('express');
const http = require('http');
const socketIo = require('socket.io'); // স্ক্রিনশটের অবিকল সকেট লাইব্রেরি সিঙ্ক
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 🌐 [✅ মেইন প্ল্যাটফর্ম এপিআই ডোমেইন লিঙ্ক লকিং বর্ম]
// আপনার স্ক্রিনশটের ৩১-৩২ নম্বর লাইনের মতো এখানে আপনার মেইন সাইটের ইউআরএল বসান:
const MAIN_SITE_URL = "https://betlover247.onrender.com"; 

// 🌐 Socket.IO কনফিগারেশন এবং CORS প্রোটেকশন গেটওয়ে
const io = socketIo(server, {
    cors: {
        origin: [MAIN_SITE_URL, "*"], // আপনার মেইন সাইট থেকে রিকোয়েস্ট এলাও লক
        methods: ["GET", "POST"]
    }
});

// 📁 মিডলওয়্যার এবং স্ট্যাটিক ফাইল পাথ কনফিগারেশন
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔐 সিকিউরিটি হেডার এবং গ্লোবাল CORS সিঙ্ক ড্রাইভার
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", MAIN_SITE_URL);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// 🎰 ইন-মেমোরি ডাটাবেজ (লাইভ ব্যালেন্স সিঙ্ক)
let usersDatabase = {
    "guest_user": { balance: 5000.00 }
};

// 🎮 এক্টিভ গেম সেশন লকিং মেকার
let activeGameSessions = {};

// 🎯 ৪-স্তর ওOdds ম্যাপ
const chickenRoadMultiRiskLadders = {
    "Easy": [1.02, 1.08, 1.14, 1.21, 1.29, 1.37, 1.46, 1.56, 1.67, 1.80, 1.94, 2.09, 2.27, 2.47, 2.69, 2.95, 3.24, 3.58, 3.98, 4.45, 5.01, 5.68, 6.49, 7.49, 8.74, 10.33, 12.39, 15.15, 18.94, 24.35],
    "Medium": [1.08, 1.22, 1.38, 1.57, 1.79, 2.06, 2.38, 2.78, 3.27, 3.89, 4.67, 5.67, 6.98, 8.73, 11.11, 14.44, 19.25, 26.48, 37.83, 56.74, 90.79, 158.88, 317.77, 794.43, 3177.72],
    "Hard": [1.19, 1.47, 1.84, 2.32, 2.97, 3.84, 5.05, 6.73, 9.13, 12.65, 17.92, 26.07, 39.11, 60.84, 98.87, 169.49, 310.74, 621.49, 1398.35, 3728.95],
    "Hardcore": [1.45, 2.22, 3.47, 5.56, 9.13, 15.46, 27.06, 49.21, 93.50, 187.01, 397.39, 908.33, 2270.83, 6358.35, 20664.00]
};

// 💰 ১. লাইভ ব্যালেন্স সিঙ্ক গেটওয়ে
app.get('/api/slot-balance', (req, res) => {
    const userId = req.query.userId || "guest_user";
    if (!usersDatabase[userId]) {
        usersDatabase[userId] = { balance: 5000.00 };
    }
    res.json({ success: true, balance: usersDatabase[userId].balance });
});

// 🟢 ২. মেইন বেট বা বাজি ধরার এপিআই
app.post('/api/chicken-bet', (req, res) => {
    const { userId, amount, riskLevel } = req.body;
    const user = userId || "guest_user";
    const betAmount = parseFloat(amount);
    const selectedRisk = riskLevel || "Hard";

    if (!usersDatabase[user] || usersDatabase[user].balance < betAmount || betAmount <= 0) {
        return res.json({ success: false, message: "❌ ব্যালেন্স অপ্রতুল ওস্তাদ!" });
    }

    usersDatabase[user].balance -= betAmount;
    
    activeGameSessions[user] = {
        stake: betAmount,
        risk: selectedRisk,
        currentLane: -1, 
        maxLanes: chickenRoadMultiRiskLadders[selectedRisk].length,
        status: "PLAYING"
    };

    io.emit('balanceUpdate', { username: user, balance: usersDatabase[user].balance });
    res.json({ success: true, balance: usersDatabase[user].balance });
});

// 🔵 ৩. ডাইনামিক জাম্প ও ট্রাফিক ক্র্যাশ ইঞ্জিন
app.post('/api/chicken-jump', (req, res) => {
    const { userId } = req.body;
    const user = userId || "guest_user";
    const session = activeGameSessions[user];

    if (!session || session.status !== "PLAYING") {
        return res.json({ success: false, message: "No active game session found!" });
    }

    session.currentLane += 1;
    const ladder = chickenRoadMultiRiskLadders[session.risk];
    const currentMultiplier = ladder[session.currentLane];

    let crashChance = 0.35; 
    if (session.risk === "Easy") crashChance = 0.10;
    if (session.risk === "Medium") crashChance = 0.22;
    if (session.risk === "Hardcore") crashChance = 0.55;

    const isCrashed = Math.random() < crashChance;

    if (isCrashed) {
        session.status = "CRASHED";
        delete activeGameSessions[user];
        return res.json({ success: true, status: "CRASH" });
    }

    if (session.currentLane >= session.maxLanes - 1) {
        const winAmount = session.stake * currentMultiplier;
        usersDatabase[user].balance += winAmount;
        session.status = "JACKPOT";
        
        delete activeGameSessions[user];
        io.emit('balanceUpdate', { username: user, balance: usersDatabase[user].balance });
        return res.json({ success: true, status: "JACKPOT", currentLane: session.currentLane, currentMultiplier });
    }

    res.json({
        success: true,
        status: "SUCCESS",
        currentLane: session.currentLane,
        currentMultiplier: currentMultiplier
    });
});

// 💰 ৪. প্রিমিয়াম ক্যাশআউট সিকোয়েন্স এপিআই
app.post('/api/chicken-cashout', (req, res) => {
    const { userId } = req.body;
    const user = userId || "guest_user";
    const session = activeGameSessions[user];

    if (!session || session.status !== "PLAYING" || session.currentLane === -1) {
        return res.json({ success: false, message: "Cannot cashout at current state!" });
    }

    const ladder = chickenRoadMultiRiskLadders[session.risk];
    const finalMultiplier = ladder[session.currentLane];
    const winAmount = session.stake * finalMultiplier;

    usersDatabase[user].balance += winAmount;
    session.status = "CASHOUTED";
    delete activeGameSessions[user];

    io.emit('balanceUpdate', { username: user, balance: usersDatabase[user].balance });
    res.json({ success: true, winAmount: winAmount, balance: usersDatabase[user].balance });
});

// 🔌 সকেট আইও কানেকশন ড্রাইভার
io.on('connection', (socket) => {
    console.log('🎰 রিয়েল-টাইম সকেট নোড সিঙ্ক সচল হয়েছে:', socket.id);
    socket.on('disconnect', () => {
        console.log('🔌 সকেট নোড ডিসকানেক্টেড');
    });
});

// 🌐 সার্ভার পোর্ট লকিং
const PORT = process.env.PORT || 9999;
server.listen(PORT, () => {
    console.log(`🚀 CHICKEN ROAD PREMIUM ENGINE RUNNING ON: http://localhost:${PORT}`);
});
