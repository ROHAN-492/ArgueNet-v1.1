let player1Score = 0;
let player2Score = 0;
let currentTurn = 1;
let player1Name = '';
let player2Name = '';
let debateTopic = '';
let winThreshold = 20;
let player1EndVote = false;
let player2EndVote = false;

/* ================= ML API FUNCTION ================= */
async function analyzeWithML(text) {
    try {
        const response = await fetch("http://172.17.212.129:8000/analyze", {   // 🔴 PUT YOUR ENDPOINT HERE
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // If API requires key, uncomment below:
                // "Authorization": "Bearer YOUR_API_KEY_HERE"
            },
            body: JSON.stringify({ text: text })
        });

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("ML API Error:", error);
        return null;
    }
}
/* ================================================== */

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function saveState() {
    const state = {
        player1Score,
        player2Score,
        currentTurn,
        player1Name,
        player2Name,
        debateTopic,
        winThreshold,
        player1EndVote,
        player2EndVote,
        messages: Array.from(document.getElementById('chatContainer').children).map(msg => ({
            player: msg.classList.contains('player1') ? 1 : 2,
            text: msg.querySelector('.message-text').textContent
        }))
    };
    localStorage.setItem('debateState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('debateState');
    if (saved) {
        const state = JSON.parse(saved);
        player1Score = state.player1Score;
        player2Score = state.player2Score;
        currentTurn = state.currentTurn;
        player1Name = state.player1Name;
        player2Name = state.player2Name;
        debateTopic = state.debateTopic;
        winThreshold = state.winThreshold;
        player1EndVote = state.player1EndVote || false;
        player2EndVote = state.player2EndVote || false;

        if (player1Name && player2Name && debateTopic) {
            initDebatePage();

            const chatContainer = document.getElementById('chatContainer');
            chatContainer.innerHTML = '';

            if (state.messages) {
                state.messages.forEach(msg => {
                    addMessageToUI(
                        msg.player === 1 ? player1Name : player2Name,
                        msg.text,
                        msg.player
                    );
                });
            }

            updateScores();
            updateTurnIndicator();
            updateEndButtons();
            showPage('debatePage');
        }
    }
}

function clearState() {
    localStorage.removeItem('debateState');
}

document.getElementById('startDebate').addEventListener('click', () => {
    player1Name = document.getElementById('player1Name').value.trim();
    player2Name = document.getElementById('player2Name').value.trim();
    debateTopic = document.getElementById('debateTopic').value.trim();
    const thresholdInput = document.getElementById('winThreshold').value;

    if (!player1Name || !player2Name || !debateTopic) {
        alert('Please fill in all fields');
        return;
    }

    winThreshold = parseInt(thresholdInput) || 20;

    player1Score = 0;
    player2Score = 0;
    currentTurn = 1;
    player1EndVote = false;
    player2EndVote = false;

    initDebatePage();
    showPage('debatePage');
    saveState();
});

function initDebatePage() {
    document.getElementById('player1NameDisplay').textContent = player1Name;
    document.getElementById('player2NameDisplay').textContent = player2Name;
    document.getElementById('topicDisplay').textContent = debateTopic;
    document.getElementById('chatContainer').innerHTML = '';
    updateScores();
    updateTurnIndicator();
    updateEndButtons();
}

function updateScores() {
    document.getElementById('player1ScoreDisplay').textContent = player1Score.toFixed(2);
    document.getElementById('player2ScoreDisplay').textContent = player2Score.toFixed(2);
}

function updateTurnIndicator() {
    const indicator = document.getElementById('turnIndicator');
    const currentPlayerName = currentTurn === 1 ? player1Name : player2Name;
    indicator.textContent = `${currentPlayerName}'s Turn`;
}

function updateEndButtons() {
    const btn1 = document.getElementById('endDebateBtn1');
    const btn2 = document.getElementById('endDebateBtn2');

    btn1.classList.toggle('voted', player1EndVote);
    btn2.classList.toggle('voted', player2EndVote);
}

function addMessageToUI(sender, text, playerNum) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message player${playerNum}`;

    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = sender;

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;

    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(textDiv);
    chatContainer.appendChild(messageDiv);

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* ================= FINAL UPDATED SEND MESSAGE ================= */
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();

    if (!text) return;

    const sender = currentTurn === 1 ? player1Name : player2Name;
    const playerNum = currentTurn;

    addMessageToUI(sender, text, playerNum);

    messageInput.value = '';
    messageInput.disabled = true;
    document.getElementById('sendBtn').disabled = true;

    const mlResult = await analyzeWithML(text);

    if (mlResult) {

        // ✅ USE CONFIDENCE VALUES
        const claimConfidence = mlResult.claim?.confidence ?? 0;
        const fallacyConfidence = mlResult.fallacy?.confidence ?? 0;
        const toxicConfidence = mlResult.toxic?.confidence ?? 0;

        // ✅ FINAL FORMULA
        // Score = (claim * 6) - (toxic * 2) - (fallacy * 2)

        const calculatedScore =
            (claimConfidence * 6) -
            (toxicConfidence * 2) -
            (fallacyConfidence * 2);

        if (playerNum === 1) {
            player1Score += calculatedScore;
        } else {
            player2Score += calculatedScore;
        }

        updateScores();
    }

    messageInput.disabled = false;
    document.getElementById('sendBtn').disabled = false;

    if (player1Score >= winThreshold || player2Score >= winThreshold) {
        showEndScreen();
        return;
    }

    currentTurn = currentTurn === 1 ? 2 : 1;
    updateTurnIndicator();
    saveState();
}
/* =============================================================== */

document.getElementById('sendBtn').addEventListener('click', sendMessage);

document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

document.getElementById('endDebateBtn1').addEventListener('click', () => {
    player1EndVote = true;
    updateEndButtons();
    saveState();
    if (player1EndVote && player2EndVote) {
        showEndScreen();
    }
});

document.getElementById('endDebateBtn2').addEventListener('click', () => {
    player2EndVote = true;
    updateEndButtons();
    saveState();
    if (player1EndVote && player2EndVote) {
        showEndScreen();
    }
});

function showEndScreen() {
    const winnerEl = document.getElementById('winnerAnnouncement');
    const scoresEl = document.getElementById('finalScores');

    if (player1Score > player2Score) {
        winnerEl.textContent = `Winner: ${player1Name}`;
    } else if (player2Score > player1Score) {
        winnerEl.textContent = `Winner: ${player2Name}`;
    } else {
        winnerEl.textContent = "It's a Draw";
    }

    scoresEl.innerHTML = `
        ${player1Name}: ${player1Score.toFixed(2)} points<br>
        ${player2Name}: ${player2Score.toFixed(2)} points<br><br>
        Thank you for playing
    `;

    showPage('endPage');
    clearState();
}

document.getElementById('newDebateBtn').addEventListener('click', () => {
    document.getElementById('player1Name').value = '';
    document.getElementById('player2Name').value = '';
    document.getElementById('debateTopic').value = '';
    document.getElementById('winThreshold').value = 20;

    player1Score = 0;
    player2Score = 0;
    currentTurn = 1;
    player1EndVote = false;
    player2EndVote = false;

    showPage('setupPage');
});

window.addEventListener('DOMContentLoaded', () => {
    loadState();
});
