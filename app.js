// Score Tracker App

// Constants
const STORAGE_KEY = 'scoreTrackerGame';
const THEME_KEY = 'scoreTrackerTheme';
const WIN_THRESHOLD = 10000;
const STARS_TO_WIN = 5;

// State
let gameState = null;
let previousPlayers = null; // Store players from last game for prefilling setup

// DOM Elements
const elements = {
    // Screens
    setupScreen: document.getElementById('setup-screen'),
    gameScreen: document.getElementById('game-screen'),
    winScreen: document.getElementById('win-screen'),

    // Setup
    playerCount: document.getElementById('player-count'),
    decreasePlayers: document.getElementById('decrease-players'),
    increasePlayers: document.getElementById('increase-players'),
    playerList: document.getElementById('player-list'),
    startGame: document.getElementById('start-game'),

    // Game
    currentRound: document.getElementById('current-round'),
    finalRoundAlert: document.getElementById('final-round-alert'),
    playersGrid: document.getElementById('players-grid'),
    currentPlayerName: document.getElementById('current-player-name'),
    scoreInput: document.getElementById('score-input'),
    addScore: document.getElementById('add-score'),
    addStar: document.getElementById('add-star'),
    removeStar: document.getElementById('remove-star'),
    toggleHistory: document.getElementById('toggle-history'),
    historyPanel: document.getElementById('history-panel'),
    historyHeader: document.getElementById('history-header'),
    historyBody: document.getElementById('history-body'),
    newGame: document.getElementById('new-game'),
    endGame: document.getElementById('end-game'),

    // Win
    winnerName: document.getElementById('winner-name'),
    winCondition: document.getElementById('win-condition'),
    standingsList: document.getElementById('standings-list'),
    newGameWin: document.getElementById('new-game-win'),

    // Modals
    editModal: document.getElementById('edit-modal'),
    editInfo: document.getElementById('edit-info'),
    editScoreInput: document.getElementById('edit-score-input'),
    cancelEdit: document.getElementById('cancel-edit'),
    deleteScore: document.getElementById('delete-score'),
    saveEdit: document.getElementById('save-edit'),

    confirmModal: document.getElementById('confirm-modal'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmCancel: document.getElementById('confirm-cancel'),
    confirmOk: document.getElementById('confirm-ok'),

    // Theme
    themeToggle: document.getElementById('theme-toggle')
};

// Edit state
let editState = {
    roundIndex: null,
    playerId: null
};

// Confirm callback
let confirmCallback = null;

// Initialize
function init() {
    initTheme();
    loadGame();
    setupEventListeners();
    renderCurrentScreen();
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme) {
        // Use saved preference
        setTheme(savedTheme);
    } else {
        // Follow system preference (CSS handles this, but we need to update toggle state)
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        updateToggleState(prefersDark);
    }

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            updateToggleState(e.matches);
        }
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateToggleState(theme === 'dark');
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let newTheme;
    if (currentTheme) {
        // Toggle from current explicit theme
        newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    } else {
        // No explicit theme set, toggle from system preference
        newTheme = systemPrefersDark ? 'light' : 'dark';
    }

    setTheme(newTheme);
}

function updateToggleState(isDark) {
    const icon = elements.themeToggle.querySelector('.theme-toggle-icon');
    icon.textContent = isDark ? '☀️' : '🌙';

    if (isDark) {
        elements.themeToggle.classList.add('dark');
    } else {
        elements.themeToggle.classList.remove('dark');
    }
}

// Load game from Local Storage
function loadGame() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            gameState = JSON.parse(saved);
        } catch (e) {
            gameState = null;
        }
    }

    if (!gameState) {
        initNewGameState();
    }
}

// Save game to Local Storage
function saveGame() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

// Initialize new game state
function initNewGameState() {
    gameState = {
        gameId: Date.now().toString(),
        players: [],
        rounds: [],
        currentRound: 1,
        currentPlayerIndex: 0,
        gameStatus: 'setup',
        winner: null,
        threshold10kTriggered: false,
        tieBreakPlayers: null
    };
}

// Setup Event Listeners
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Setup screen
    elements.playerCount.addEventListener('change', handlePlayerCountChange);
    elements.decreasePlayers.addEventListener('click', () => adjustPlayerCount(-1));
    elements.increasePlayers.addEventListener('click', () => adjustPlayerCount(1));
    elements.startGame.addEventListener('click', startGame);

    // Game screen
    elements.addScore.addEventListener('click', addScore);
    elements.scoreInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addScore();
    });
    elements.addStar.addEventListener('click', addStar);
    elements.removeStar.addEventListener('click', removeStar);
    elements.toggleHistory.addEventListener('click', toggleHistory);
    elements.newGame.addEventListener('click', () => showConfirm('New Game', 'Start a new game? Current progress will be saved and you can start fresh.', confirmNewGame));
    elements.endGame.addEventListener('click', () => showConfirm('End Game', 'End the game now? Final standings will be shown.', confirmEndGame));

    // Win screen
    elements.newGameWin.addEventListener('click', confirmNewGame);

    // Edit modal
    elements.cancelEdit.addEventListener('click', closeEditModal);
    elements.deleteScore.addEventListener('click', deleteScore);
    elements.saveEdit.addEventListener('click', saveScore);

    // Confirm modal
    elements.confirmCancel.addEventListener('click', closeConfirmModal);
    elements.confirmOk.addEventListener('click', () => {
        const callback = confirmCallback;
        closeConfirmModal();
        if (callback) callback();
    });
}

// Render current screen based on game status
function renderCurrentScreen() {
    hideAllScreens();

    switch (gameState.gameStatus) {
        case 'setup':
            elements.setupScreen.classList.add('active');
            renderSetupScreen();
            break;
        case 'active':
        case 'finalRound':
        case 'tieBreaker':
            elements.gameScreen.classList.add('active');
            renderGameScreen();
            break;
        case 'finished':
            elements.winScreen.classList.add('active');
            renderWinScreen();
            break;
    }
}

function hideAllScreens() {
    elements.setupScreen.classList.remove('active');
    elements.gameScreen.classList.remove('active');
    elements.winScreen.classList.remove('active');
}

// Setup Screen
function renderSetupScreen() {
    // Use previous players if available
    if (previousPlayers && previousPlayers.length > 0) {
        elements.playerCount.value = previousPlayers.length;
        renderPlayerList(previousPlayers.length, previousPlayers);
        previousPlayers = null; // Clear after using so manual edits persist
    } else {
        const count = parseInt(elements.playerCount.value) || 2;
        renderPlayerList(count);
    }
}

function handlePlayerCountChange() {
    let count = parseInt(elements.playerCount.value);
    if (isNaN(count) || count < 2) count = 2;
    if (count > 10) count = 10;
    elements.playerCount.value = count;
    renderPlayerList(count);
}

function adjustPlayerCount(delta) {
    let count = parseInt(elements.playerCount.value) + delta;
    if (count < 2) count = 2;
    if (count > 10) count = 10;
    elements.playerCount.value = count;
    renderPlayerList(count);
}

function renderPlayerList(count, prefillPlayers = null) {
    // Preserve existing names from DOM, or use prefill data
    const existingNames = [];
    if (prefillPlayers) {
        prefillPlayers.forEach(p => existingNames.push(p.name));
    } else {
        const inputs = elements.playerList.querySelectorAll('.player-name-input');
        inputs.forEach(input => existingNames.push(input.value));
    }

    elements.playerList.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const li = document.createElement('li');
        li.className = 'player-item';
        li.draggable = true;
        li.dataset.index = i;

        const name = existingNames[i] || `Player ${i + 1}`;

        li.innerHTML = `
            <span class="drag-handle">☰</span>
            <span class="player-order">${i + 1}</span>
            <input type="text" class="player-name-input" value="${escapeHtml(name)}" placeholder="Player ${i + 1}" maxlength="20">
            <div class="order-buttons">
                <button type="button" class="order-btn move-up" ${i === 0 ? 'disabled' : ''}>▲</button>
                <button type="button" class="order-btn move-down" ${i === count - 1 ? 'disabled' : ''}>▼</button>
            </div>
        `;

        // Drag events
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragend', handleDragEnd);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragleave', handleDragLeave);

        // Move buttons - read current index from dataset to handle reordering
        li.querySelector('.move-up').addEventListener('click', function() {
            const currentIndex = parseInt(this.closest('.player-item').dataset.index);
            movePlayer(currentIndex, -1);
        });
        li.querySelector('.move-down').addEventListener('click', function() {
            const currentIndex = parseInt(this.closest('.player-item').dataset.index);
            movePlayer(currentIndex, 1);
        });

        // Select all text on focus for easy replacement
        li.querySelector('.player-name-input').addEventListener('focus', (e) => e.target.select());

        elements.playerList.appendChild(li);
    }
}

let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.player-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedItem = null;
}

function handleDragOver(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    if (this !== draggedItem) {
        const items = Array.from(elements.playerList.children);
        const fromIndex = items.indexOf(draggedItem);
        const toIndex = items.indexOf(this);

        if (fromIndex < toIndex) {
            this.parentNode.insertBefore(draggedItem, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedItem, this);
        }

        updatePlayerOrder();
    }
}

function movePlayer(index, direction) {
    const items = Array.from(elements.playerList.children);
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= items.length) return;

    const item = items[index];
    const target = items[newIndex];

    if (direction < 0) {
        target.parentNode.insertBefore(item, target);
    } else {
        target.parentNode.insertBefore(item, target.nextSibling);
    }

    updatePlayerOrder();
}

function updatePlayerOrder() {
    const items = elements.playerList.querySelectorAll('.player-item');
    items.forEach((item, index) => {
        item.dataset.index = index;
        item.querySelector('.player-order').textContent = index + 1;

        const upBtn = item.querySelector('.move-up');
        const downBtn = item.querySelector('.move-down');

        upBtn.disabled = index === 0;
        downBtn.disabled = index === items.length - 1;
    });
}

function startGame() {
    const inputs = elements.playerList.querySelectorAll('.player-name-input');
    const players = [];

    inputs.forEach((input, index) => {
        const name = input.value.trim() || `Player ${index + 1}`;
        players.push({
            id: index + 1,
            name: name,
            order: index,
            stars: 0
        });
    });

    if (players.length < 2) {
        showToast('Need at least 2 players');
        return;
    }

    gameState.players = players;
    gameState.rounds = [{
        roundNum: 1,
        scores: {},
        starsAwarded: {}
    }];
    gameState.currentRound = 1;
    gameState.currentPlayerIndex = 0;
    gameState.gameStatus = 'active';
    gameState.winner = null;
    gameState.threshold10kTriggered = false;

    saveGame();
    renderCurrentScreen();
}

// Game Screen
function renderGameScreen() {
    elements.currentRound.textContent = gameState.currentRound;

    // Final round / tie breaker alert
    if (gameState.gameStatus === 'tieBreaker') {
        elements.finalRoundAlert.textContent = 'Tie Breaker!';
        elements.finalRoundAlert.classList.remove('hidden');
    } else if (gameState.gameStatus === 'finalRound') {
        elements.finalRoundAlert.textContent = 'Final Round!';
        elements.finalRoundAlert.classList.remove('hidden');
    } else {
        elements.finalRoundAlert.classList.add('hidden');
    }

    renderPlayersGrid();
    updateCurrentPlayerDisplay();
    renderHistory();
}

function renderPlayersGrid() {
    elements.playersGrid.innerHTML = '';

    const currentRoundData = getCurrentRoundData();
    const playersInRound = gameState.tieBreakPlayers || gameState.players;
    const currentPlayer = playersInRound[gameState.currentPlayerIndex];

    gameState.players.forEach((player) => {
        const card = document.createElement('div');
        card.className = 'player-card';

        // In tie breaker mode, highlight the current tie break player
        // In normal mode, just check if this is the current player
        const isCurrentPlayer = currentPlayer && player.id === currentPlayer.id;
        const isInTieBreaker = gameState.tieBreakPlayers &&
            gameState.tieBreakPlayers.some(p => p.id === player.id);

        if (isCurrentPlayer) {
            card.classList.add('current');
        }

        // Dim players not in tie breaker during tie breaker mode
        if (gameState.gameStatus === 'tieBreaker' && !isInTieBreaker) {
            card.style.opacity = '0.5';
        }

        const totalScore = calculatePlayerTotal(player.id);
        const roundScore = currentRoundData.scores[player.id];
        const hasScoreThisRound = roundScore !== undefined;

        const stars = '★'.repeat(player.stars) + '☆'.repeat(STARS_TO_WIN - player.stars);

        card.innerHTML = `
            <div class="player-card-name">${escapeHtml(player.name)}</div>
            <div class="player-card-score">${totalScore.toLocaleString()}</div>
            <div class="player-card-stars ${player.stars === 0 ? 'empty' : ''}">${stars}</div>
            ${hasScoreThisRound ? `<div class="player-card-pending has-score">+${roundScore}</div>` : '<div class="player-card-pending">—</div>'}
        `;

        elements.playersGrid.appendChild(card);
    });
}

function updateCurrentPlayerDisplay() {
    const playersInRound = gameState.tieBreakPlayers || gameState.players;
    const currentPlayer = playersInRound[gameState.currentPlayerIndex];
    elements.currentPlayerName.textContent = currentPlayer.name;
    elements.scoreInput.value = '';
    elements.scoreInput.focus();
}

function getCurrentRoundData() {
    return gameState.rounds.find(r => r.roundNum === gameState.currentRound) || {
        roundNum: gameState.currentRound,
        scores: {},
        starsAwarded: {}
    };
}

function calculatePlayerTotal(playerId) {
    let total = 0;
    gameState.rounds.forEach(round => {
        if (round.scores[playerId] !== undefined) {
            total += round.scores[playerId];
        }
    });
    return total;
}

function addScore() {
    const score = parseInt(elements.scoreInput.value);
    if (isNaN(score)) {
        showToast('Please enter a valid score');
        return;
    }

    const playersInRound = gameState.tieBreakPlayers || gameState.players;
    const currentPlayer = playersInRound[gameState.currentPlayerIndex];
    let roundData = gameState.rounds.find(r => r.roundNum === gameState.currentRound);

    if (!roundData) {
        roundData = {
            roundNum: gameState.currentRound,
            scores: {},
            starsAwarded: {}
        };
        gameState.rounds.push(roundData);
    }

    roundData.scores[currentPlayer.id] = score;

    // Check for 10k threshold (only in normal gameplay, not tie breaker)
    if (gameState.gameStatus !== 'tieBreaker') {
        const newTotal = calculatePlayerTotal(currentPlayer.id);
        if (newTotal >= WIN_THRESHOLD && !gameState.threshold10kTriggered) {
            gameState.threshold10kTriggered = true;
            gameState.gameStatus = 'finalRound';
            showToast(`${currentPlayer.name} crossed ${WIN_THRESHOLD.toLocaleString()}! Final round!`);
        }
    }

    // Move to next player
    advanceToNextPlayer();

    saveGame();
    renderGameScreen();
}

function addStar() {
    const playersInRound = gameState.tieBreakPlayers || gameState.players;
    const currentPlayer = playersInRound[gameState.currentPlayerIndex];
    currentPlayer.stars++;

    // Record star in current round
    let roundData = gameState.rounds.find(r => r.roundNum === gameState.currentRound);
    if (!roundData) {
        roundData = {
            roundNum: gameState.currentRound,
            scores: {},
            starsAwarded: {}
        };
        gameState.rounds.push(roundData);
    }
    roundData.starsAwarded[currentPlayer.id] = (roundData.starsAwarded[currentPlayer.id] || 0) + 1;

    // Record 0 score for this turn
    roundData.scores[currentPlayer.id] = 0;

    // Check for 5-star win
    if (currentPlayer.stars >= STARS_TO_WIN) {
        gameState.winner = {
            playerId: currentPlayer.id,
            name: currentPlayer.name,
            winCondition: 'stars'
        };
        gameState.gameStatus = 'finished';
        saveGame();
        renderCurrentScreen();
        return;
    }

    showToast(`⭐ Star awarded to ${currentPlayer.name}!`);

    // Advance to next player
    advanceToNextPlayer();

    saveGame();
    renderGameScreen();
}

function removeStar() {
    const playersInRound = gameState.tieBreakPlayers || gameState.players;
    const currentPlayer = playersInRound[gameState.currentPlayerIndex];

    if (currentPlayer.stars <= 0) {
        showToast(`${currentPlayer.name} has no stars to remove`);
        return;
    }

    currentPlayer.stars--;

    // Update star count in current round data if it exists
    let roundData = gameState.rounds.find(r => r.roundNum === gameState.currentRound);
    if (roundData && roundData.starsAwarded[currentPlayer.id]) {
        roundData.starsAwarded[currentPlayer.id]--;
        if (roundData.starsAwarded[currentPlayer.id] <= 0) {
            delete roundData.starsAwarded[currentPlayer.id];
        }
    }

    showToast(`Star removed from ${currentPlayer.name}`);
    saveGame();
    renderGameScreen();
}

function advanceToNextPlayer() {
    // Determine how many players are in the current round
    const playersInRound = gameState.tieBreakPlayers || gameState.players;

    gameState.currentPlayerIndex++;

    // Check if round is complete
    if (gameState.currentPlayerIndex >= playersInRound.length) {
        // All players have entered scores for this round
        gameState.currentPlayerIndex = 0;

        // Check for tie breaker round completion
        if (gameState.gameStatus === 'tieBreaker') {
            determineWinner();
            return;
        }

        // Check for final round completion
        if (gameState.gameStatus === 'finalRound') {
            determineWinner();
            return;
        }

        // Start new round
        gameState.currentRound++;
        gameState.rounds.push({
            roundNum: gameState.currentRound,
            scores: {},
            starsAwarded: {}
        });
    }
}

function determineWinner(condition = '10k') {
    // Determine which players to consider (all players or just tie breaker players)
    const playersToCheck = gameState.tieBreakPlayers || gameState.players;

    // Find highest score among relevant players
    let highestScore = -Infinity;
    playersToCheck.forEach(player => {
        const total = calculatePlayerTotal(player.id);
        if (total > highestScore) {
            highestScore = total;
        }
    });

    // Find all players with the highest score
    const topPlayers = playersToCheck.filter(player =>
        calculatePlayerTotal(player.id) === highestScore
    );

    // Check for ties
    if (topPlayers.length > 1) {
        if (condition === 'manual') {
            // Manual end with tie - declare a tie
            gameState.winner = {
                isTie: true,
                players: topPlayers.map(p => ({ playerId: p.id, name: p.name })),
                winCondition: 'tie'
            };
            gameState.gameStatus = 'finished';
            saveGame();
            renderCurrentScreen();
        } else {
            // 10k threshold with tie - start tie breaker
            startTieBreaker(topPlayers);
        }
    } else {
        // Clear winner
        const winner = topPlayers[0];
        gameState.winner = {
            playerId: winner.id,
            name: winner.name,
            winCondition: gameState.tieBreakPlayers ? 'tieBreaker' : condition
        };
        gameState.tieBreakPlayers = null; // Clear tie breaker state
        gameState.gameStatus = 'finished';
        saveGame();
        renderCurrentScreen();
    }
}

function startTieBreaker(tiedPlayers) {
    gameState.tieBreakPlayers = tiedPlayers;
    gameState.gameStatus = 'tieBreaker';
    gameState.currentRound++;
    gameState.currentPlayerIndex = 0;
    gameState.rounds.push({
        roundNum: gameState.currentRound,
        scores: {},
        starsAwarded: {},
        isTieBreaker: true,
        tieBreakPlayerIds: tiedPlayers.map(p => p.id)
    });

    const names = tiedPlayers.map(p => p.name).join(' & ');
    showToast(`Tie breaker round! ${names} are tied at ${calculatePlayerTotal(tiedPlayers[0].id).toLocaleString()} points`);

    saveGame();
    renderCurrentScreen();
}

// History
function toggleHistory() {
    elements.historyPanel.classList.toggle('hidden');
    elements.toggleHistory.classList.toggle('expanded');
}

function renderHistory() {
    // Header
    let headerHtml = '<th>Round</th>';
    gameState.players.forEach(player => {
        headerHtml += `<th>${escapeHtml(player.name)}</th>`;
    });
    elements.historyHeader.innerHTML = headerHtml;

    // Body
    let bodyHtml = '';
    gameState.rounds.forEach((round, roundIndex) => {
        bodyHtml += `<tr><td class="round-cell">${round.roundNum}</td>`;
        gameState.players.forEach(player => {
            const score = round.scores[player.id];
            const starAwarded = round.starsAwarded[player.id];
            let cellContent = score !== undefined ? score : '—';
            if (starAwarded) {
                cellContent += ` <span class="star-indicator">${'⭐'.repeat(starAwarded)}</span>`;
            }
            bodyHtml += `<td data-round="${roundIndex}" data-player="${player.id}">${cellContent}</td>`;
        });
        bodyHtml += '</tr>';
    });

    // Totals row
    bodyHtml += '<tr><td class="round-cell"><strong>Total</strong></td>';
    gameState.players.forEach(player => {
        const total = calculatePlayerTotal(player.id);
        bodyHtml += `<td class="round-cell"><strong>${total.toLocaleString()}</strong></td>`;
    });
    bodyHtml += '</tr>';

    elements.historyBody.innerHTML = bodyHtml;

    // Add click handlers for editing
    elements.historyBody.querySelectorAll('td[data-round]').forEach(cell => {
        cell.addEventListener('click', () => {
            const roundIndex = parseInt(cell.dataset.round);
            const playerId = parseInt(cell.dataset.player);
            openEditModal(roundIndex, playerId);
        });
    });
}

// Edit Modal
function openEditModal(roundIndex, playerId) {
    editState.roundIndex = roundIndex;
    editState.playerId = playerId;

    const round = gameState.rounds[roundIndex];
    const player = gameState.players.find(p => p.id === playerId);
    const currentScore = round.scores[playerId];

    elements.editInfo.textContent = `${player.name} - Round ${round.roundNum}`;
    elements.editScoreInput.value = currentScore !== undefined ? currentScore : '';

    elements.editModal.classList.remove('hidden');
    elements.editScoreInput.focus();
}

function closeEditModal() {
    elements.editModal.classList.add('hidden');
    editState.roundIndex = null;
    editState.playerId = null;
}

function saveScore() {
    const newScore = parseInt(elements.editScoreInput.value);
    if (isNaN(newScore)) {
        showToast('Please enter a valid score');
        return;
    }

    const round = gameState.rounds[editState.roundIndex];
    round.scores[editState.playerId] = newScore;

    // Recalculate threshold status
    recalculateGameStatus();

    saveGame();
    closeEditModal();
    renderGameScreen();
    showToast('Score updated');
}

function deleteScore() {
    const round = gameState.rounds[editState.roundIndex];
    delete round.scores[editState.playerId];

    // Recalculate threshold status
    recalculateGameStatus();

    saveGame();
    closeEditModal();
    renderGameScreen();
    showToast('Score deleted');
}

function recalculateGameStatus() {
    // Check if any player is over 10k
    let anyOver10k = false;
    gameState.players.forEach(player => {
        if (calculatePlayerTotal(player.id) >= WIN_THRESHOLD) {
            anyOver10k = true;
        }
    });

    if (anyOver10k && gameState.gameStatus === 'active') {
        gameState.threshold10kTriggered = true;
        gameState.gameStatus = 'finalRound';
    } else if (!anyOver10k && gameState.gameStatus === 'finalRound') {
        gameState.threshold10kTriggered = false;
        gameState.gameStatus = 'active';
    }
}

// Confirm Modal
function showConfirm(title, message, callback) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    confirmCallback = callback;
    elements.confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
    elements.confirmModal.classList.add('hidden');
    confirmCallback = null;
}

function confirmNewGame() {
    // Save previous players for prefilling setup
    if (gameState.players && gameState.players.length > 0) {
        previousPlayers = gameState.players.map(p => ({ name: p.name, order: p.order }));
    }

    initNewGameState();
    // Collapse history panel if open
    elements.historyPanel.classList.add('hidden');
    elements.toggleHistory.classList.remove('expanded');
    saveGame();
    renderCurrentScreen();
}

function confirmEndGame() {
    determineWinner('manual');
}

// Win Screen
function renderWinScreen() {
    const winner = gameState.winner;
    const trophy = document.querySelector('.trophy');

    // Handle ties
    if (winner.isTie) {
        const names = winner.players.map(p => p.name).join(' & ');
        elements.winnerName.textContent = `It's a Tie!`;
        elements.winCondition.textContent = `${names} are tied for first place`;
        trophy.textContent = '🤝';
    } else {
        elements.winnerName.textContent = `${winner.name} Wins!`;
        trophy.textContent = '🏆';

        if (winner.winCondition === 'stars') {
            elements.winCondition.textContent = `Collected ${STARS_TO_WIN} stars!`;
        } else if (winner.winCondition === 'manual') {
            elements.winCondition.textContent = `Game ended - Highest score wins!`;
        } else if (winner.winCondition === 'tieBreaker') {
            elements.winCondition.textContent = `Won the tie breaker!`;
        } else {
            elements.winCondition.textContent = `Highest score after ${WIN_THRESHOLD.toLocaleString()} point threshold`;
        }
    }

    // Sort players by score
    const standings = [...gameState.players].sort((a, b) => {
        return calculatePlayerTotal(b.id) - calculatePlayerTotal(a.id);
    });

    let standingsHtml = '';
    standings.forEach(player => {
        const total = calculatePlayerTotal(player.id);
        const stars = '★'.repeat(player.stars);
        standingsHtml += `
            <li class="standings-item">
                <span class="standings-name">${escapeHtml(player.name)}</span>
                <span class="standings-score">${total.toLocaleString()}</span>
                <span class="standings-stars">${stars}</span>
            </li>
        `;
    });
    elements.standingsList.innerHTML = standingsHtml;
}

// Toast notification
function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start the app
init();
