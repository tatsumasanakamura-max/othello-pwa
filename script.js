/* global OthelloGameAI */

(function () {
  const BOARD_SIZE = 8;
  const BLACK = 'black';
  const WHITE = 'white';
  const THINKING_DELAY = 500;

  const menuScreen = document.getElementById('menuScreen');
  const gameScreen = document.getElementById('gameScreen');
  const boardElement = document.getElementById('board');
  const blackCountElement = document.getElementById('blackCount');
  const whiteCountElement = document.getElementById('whiteCount');
  const turnLabelElement = document.getElementById('turnLabel');
  const thinkingLabelElement = document.getElementById('thinkingLabel');
  const messageTextElement = document.getElementById('messageText');
  const debugPanelElement = document.getElementById('debugPanel');
  const debugInfoElement = document.getElementById('debugInfo');
  const passOverlayElement = document.getElementById('passOverlay');
  const passOverlayTextElement = document.getElementById('passOverlayText');
  const celebrationLayer = document.getElementById('celebrationLayer');

  const twoPlayerButton = document.getElementById('twoPlayerButton');
  const cpuStartButton = document.getElementById('cpuStartButton');
  const resetButton = document.getElementById('resetButton');
  const rematchButton = document.getElementById('rematchButton');
  const backToMenuButton = document.getElementById('backToMenuButton');
  const debugToggleButton = document.getElementById('debugToggleButton');
  const sideButtons = Array.from(document.querySelectorAll('[data-side]'));
  const levelButtons = Array.from(document.querySelectorAll('[data-level]'));

  const state = {
    mode: null,
    cpuLevel: 'easy',
    humanColor: BLACK,
    board: createInitialBoard(),
    turn: BLACK,
    gameOver: false,
    thinking: false,
    passActive: false,
    passTimer: null,
    passMessage: '',
    pendingCpuTimer: null,
    lastAction: null,
    lastActionTimer: null,
    lastSearchInfo: null,
    moveHistory: [],
    cells: [],
    winnerCelebrated: false,
    winner: null,
    debugMode: false,
  };

  function createInitialBoard() {
    const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    return board;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function opposite(color) {
    return color === BLACK ? WHITE : BLACK;
  }

  function formatPlayer(color) {
    return color === BLACK ? '\u9ed2' : '\u767d';
  }

  function clearCpuTimer() {
    if (state.pendingCpuTimer !== null) {
      window.clearTimeout(state.pendingCpuTimer);
      state.pendingCpuTimer = null;
    }
  }

  function clearPassTimer() {
    if (state.passTimer !== null) {
      window.clearTimeout(state.passTimer);
      state.passTimer = null;
    }
  }

  function clearLastActionTimer() {
    if (state.lastActionTimer !== null) {
      window.clearTimeout(state.lastActionTimer);
      state.lastActionTimer = null;
    }
  }

  function setScreen(showGame) {
    menuScreen.hidden = showGame;
    gameScreen.hidden = !showGame;
  }

  function syncMenuSelection() {
    for (const button of sideButtons) {
      button.classList.toggle('is-selected', button.dataset.side === state.humanColor);
    }

    for (const button of levelButtons) {
      button.classList.toggle('is-selected', button.dataset.level === state.cpuLevel);
    }

    if (debugToggleButton) {
      debugToggleButton.setAttribute('aria-pressed', String(state.debugMode));
      debugToggleButton.textContent = state.debugMode ? 'デバッグモード: ON' : 'デバッグモード: OFF';
    }
  }

  function setupBoardGrid() {
    if (state.cells.length > 0) {
      return;
    }

    const fragment = document.createDocumentFragment();

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const button = document.createElement('button');
        button.className = 'cell';
        button.type = 'button';
        button.dataset.row = String(row);
        button.dataset.col = String(col);
        button.setAttribute('aria-label', `${row + 1} row ${col + 1} column`);
        button.addEventListener('click', onCellClick);
        fragment.appendChild(button);
        state.cells.push(button);
      }
    }

    boardElement.appendChild(fragment);
  }

  function isCpuGame() {
    return state.mode === 'cpu';
  }

  function getCpuColor() {
    return opposite(state.humanColor);
  }

  function isCpuTurn() {
    return isCpuGame() && state.turn === getCpuColor() && !state.gameOver;
  }

  function isHumanColor(color) {
    return !isCpuGame() || color === state.humanColor;
  }

  function formatActor(color) {
    if (!isCpuGame()) {
      return formatPlayer(color);
    }

    return isHumanColor(color) ? `あなた（${formatPlayer(color)}）` : `CPU（${formatPlayer(color)}）`;
  }

  function startGame(mode, cpuLevel, humanColor) {
    clearCpuTimer();
    clearPassTimer();
    clearLastActionTimer();
    state.mode = mode;
    state.cpuLevel = cpuLevel || state.cpuLevel;
    state.humanColor = humanColor || BLACK;
    state.board = createInitialBoard();
    state.turn = BLACK;
    state.gameOver = false;
    state.thinking = false;
    state.passActive = false;
    state.passMessage = '';
    state.lastAction = null;
    state.lastSearchInfo = null;
    state.moveHistory = [];
    state.winnerCelebrated = false;
    state.winner = null;
    syncMenuSelection();
    setScreen(true);
    render();
    handleTurnFlow();
  }

  function restartCurrentGame() {
    if (!state.mode) {
      return;
    }

    startGame(state.mode, state.cpuLevel, state.humanColor);
  }

  function returnToMenu() {
    clearCpuTimer();
    clearPassTimer();
    clearLastActionTimer();
    state.mode = null;
    state.turn = BLACK;
    state.thinking = false;
    state.passActive = false;
    state.passMessage = '';
    state.gameOver = false;
    state.lastAction = null;
    state.winner = null;
    state.lastSearchInfo = null;
    state.moveHistory = [];
    syncMenuSelection();
    setScreen(false);
    renderMenuMessage();
    render();
  }

  function renderMenuMessage() {
    messageTextElement.textContent = '\u4e8c\u4eba\u5bfe\u6226\u304b\u3001CPU\u5bfe\u6226\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002';
  }

  function getLegalMoves(board, color) {
    return OthelloGameAI.getLegalMoves(board, color);
  }

  function countStones(board) {
    let black = 0;
    let white = 0;

    for (const row of board) {
      for (const cell of row) {
        if (cell === BLACK) {
          black += 1;
        } else if (cell === WHITE) {
          white += 1;
        }
      }
    }

    return { black, white };
  }

  function applyMove(board, move, color) {
    const nextBoard = cloneBoard(board);
    nextBoard[move.row][move.col] = color;
    for (const [row, col] of move.flips) {
      nextBoard[row][col] = color;
    }
    return nextBoard;
  }

  function onCellClick(event) {
    if (isCpuTurn() || state.gameOver || state.thinking || state.passActive) {
      return;
    }

    const row = Number(event.currentTarget.dataset.row);
    const col = Number(event.currentTarget.dataset.col);
    const legalMoves = getLegalMoves(state.board, state.turn);
    const move = legalMoves.find((item) => item.row === row && item.col === col);

    if (move) {
      playMove(move, state.turn);
    }
  }

  function playMove(move, color) {
    clearLastActionTimer();
    state.board = applyMove(state.board, move, color);
    state.lastAction = {
      placed: { row: move.row, col: move.col },
      flipped: move.flips.map(([row, col]) => ({ row, col })),
    };
    state.lastActionTimer = window.setTimeout(() => {
      state.lastAction = null;
      state.lastActionTimer = null;
    }, 650);
    state.moveHistory.push(`${move.row},${move.col}`);
    state.turn = opposite(color);
    state.thinking = false;
    state.gameOver = false;
    render();
    handleTurnFlow();
  }

  function handleTurnFlow() {
    if (state.gameOver || state.passActive) {
      return;
    }

    const legalMoves = getLegalMoves(state.board, state.turn);
    if (legalMoves.length > 0) {
      render();
      if (isCpuTurn()) {
        scheduleCpuMove();
      } else {
        state.thinking = false;
        render();
      }
      return;
    }

    handlePass();
  }

  function handlePass() {
    const passedColor = state.turn;
    const nextColor = opposite(passedColor);
    const nextMoves = getLegalMoves(state.board, nextColor);
    const actor = formatActor(passedColor);
    const nextText = nextMoves.length > 0
      ? `次は${formatPlayer(nextColor)}の手番です`
      : '相手も置ける場所がないためゲーム終了です';

    clearPassTimer();
    state.thinking = false;
    state.passActive = true;
    clearLastActionTimer();
    state.lastAction = null;
    state.passMessage = `${actor}は置ける場所がないためパス。${nextText}`;
    state.lastSearchInfo = state.debugMode ? {
      ...(state.lastSearchInfo || {}),
      reason: `pass:${actor}`,
      candidates: '合法手なし',
    } : state.lastSearchInfo;
    render();

    state.passTimer = window.setTimeout(() => {
      state.passTimer = null;
      state.passActive = false;
      state.passMessage = '';

      if (nextMoves.length === 0) {
        state.gameOver = true;
        clearCpuTimer();
        render();
        finishGame();
        return;
      }

      state.turn = nextColor;
      render();
      handleTurnFlow();
    }, 1400);
  }

  function scheduleCpuMove() {
    clearCpuTimer();
    if (state.passActive) {
      return;
    }
    state.thinking = true;
    render();

    state.pendingCpuTimer = window.setTimeout(() => {
      state.pendingCpuTimer = null;

      const cpuColor = getCpuColor();
      if (state.gameOver || state.passActive || state.turn !== cpuColor) {
        state.thinking = false;
        render();
        return;
      }

      const result = OthelloGameAI.chooseMove(state.board, cpuColor, state.cpuLevel, {
        history: state.moveHistory,
        debug: state.debugMode,
      });

      state.lastSearchInfo = result && result.debug ? result.debug : {
        depth: result ? result.depth : 0,
        score: result ? result.score : 0,
        nodes: result ? result.nodes : 0,
        timeMs: result ? result.timeMs : 0,
        reason: result ? result.reason : '',
        candidates: result && result.candidates
          ? result.candidates.slice(0, 5).map((item) => `${item.move}:${Math.round(item.score)}`).join(' / ')
          : '',
      };

      const move = result ? result.move : null;
      if (!move) {
        state.thinking = false;
        handleTurnFlow();
        return;
      }

      state.thinking = false;
      playMove(move, cpuColor);
    }, THINKING_DELAY);
  }

  function markWinnerStones(winner) {
    for (const cell of state.cells) {
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      const stone = cell.querySelector('.stone');

      if (stone) {
        stone.classList.toggle('stone--winner', state.board[row][col] === winner);
      }
    }
  }

  function triggerCelebration(winner) {
    const colors = winner === BLACK
      ? ['#2b2b2b', '#5d5d5d', '#f3d38a']
      : ['#ffffff', '#d7d7d7', '#f1b44c'];

    celebrationLayer.innerHTML = '';

    for (let index = 0; index < 28; index += 1) {
      const piece = document.createElement('span');
      piece.className = 'confetti';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.top = `${Math.random() * 25}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.setProperty('--dx', `${(Math.random() * 2 - 1) * 160}px`);
      piece.style.animationDelay = `${Math.random() * 180}ms`;
      piece.style.transform = `rotate(${Math.random() * 180}deg)`;
      celebrationLayer.appendChild(piece);
    }

    window.setTimeout(() => {
      celebrationLayer.innerHTML = '';
    }, 1600);
  }

  function finishGame() {
    const { black, white } = countStones(state.board);
    let resultText = `\u5f15\u304d\u5206\u3051\u3067\u3059\u3002${black}\u5bfe${white}`;
    let winner = null;

    if (black > white) {
      resultText = `\u9ed2\u306e\u52dd\u3061\u3067\u3059\u3002${black}\u5bfe${white}`;
      winner = BLACK;
    } else if (white > black) {
      resultText = `\u767d\u306e\u52dd\u3061\u3067\u3059\u3002${white}\u5bfe${black}`;
      winner = WHITE;
    }

    state.winner = winner;
    messageTextElement.textContent = resultText;
    turnLabelElement.textContent = '\u30b2\u30fc\u30e0\u7d42\u4e86';

    if (winner) {
      if (!state.winnerCelebrated) {
        state.winnerCelebrated = true;
        triggerCelebration(winner);
      }
      markWinnerStones(winner);
    }
  }

  function updateBoardView() {
    const legalMoves = state.gameOver ? [] : getLegalMoves(state.board, state.turn);
    const legalMap = new Set(legalMoves.map((move) => `${move.row},${move.col}`));
    const lastAction = state.lastAction;
    const flipIndexMap = new Map();
    if (lastAction) {
      lastAction.flipped.forEach((item, index) => {
        flipIndexMap.set(`${item.row},${item.col}`, index);
      });
    }
    const placedKey = lastAction ? `${lastAction.placed.row},${lastAction.placed.col}` : null;

    for (const cell of state.cells) {
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      const value = state.board[row][col];
      const key = `${row},${col}`;

      cell.classList.toggle('cell--legal', legalMap.has(key) && !state.gameOver && !state.thinking && !state.passActive);
      cell.disabled = state.gameOver || state.thinking || state.passActive || !legalMap.has(key);

      let stone = cell.querySelector('.stone');

      if (value === null) {
        if (stone) {
          stone.remove();
        }
        continue;
      }

      if (!stone) {
        stone = document.createElement('div');
        stone.className = 'stone';
        cell.appendChild(stone);
      }

      if (!stone.querySelector('.stone-core')) {
        stone.innerHTML = '<div class="stone-core"><span class="stone-face stone-face--front"></span><span class="stone-face stone-face--back"></span></div>';
      }

      stone.classList.remove('stone--black', 'stone--white', 'stone--new', 'stone--flip', 'stone--winner');
      stone.style.removeProperty('--flip-delay');
      stone.classList.add(value === BLACK ? 'stone--black' : 'stone--white');
      stone.dataset.front = value;
      stone.dataset.back = value;

      if (placedKey === key) {
        stone.classList.add('stone--new');
      } else if (flipIndexMap.has(key)) {
        const previousValue = opposite(value);
        stone.dataset.front = previousValue;
        stone.dataset.back = value;
        stone.style.setProperty('--flip-delay', `${flipIndexMap.get(key) * 45}ms`);
        stone.classList.add('stone--flip');
      } else {
        stone.dataset.front = value;
        stone.dataset.back = value;
      }
    }

  }

  function renderScores() {
    const { black, white } = countStones(state.board);
    blackCountElement.textContent = String(black);
    whiteCountElement.textContent = String(white);
  }

  function renderDebugPanel() {
    if (!debugPanelElement || !debugInfoElement) {
      return;
    }

    if (!state.debugMode) {
      debugPanelElement.hidden = true;
      return;
    }

    debugPanelElement.hidden = false;

    if (!state.lastSearchInfo) {
      debugInfoElement.textContent = '未計測';
      return;
    }

    const info = state.lastSearchInfo;
    debugInfoElement.textContent = [
      `探索深さ: ${info.depth || 0}`,
      `評価値: ${Math.round(info.score || 0)}`,
      `候補手: ${info.candidates || 'なし'}`,
      `探索ノード数: ${info.nodes || 0}`,
      `思考時間(ms): ${info.timeMs || 0}`,
      `採用理由: ${info.reason || 'unknown'}`,
    ].join('\n');
  }

  function renderPassOverlay() {
    if (!passOverlayElement || !passOverlayTextElement) {
      return;
    }

    passOverlayElement.hidden = !state.passActive;
    passOverlayTextElement.textContent = state.passActive ? state.passMessage : '';
  }

  function renderTurnLabel() {
    if (state.gameOver) {
      turnLabelElement.textContent = state.winner
        ? `${formatPlayer(state.winner)}\u306e\u52dd\u3061`
        : '\u30b2\u30fc\u30e0\u7d42\u4e86';
      return;
    }

    const colorClass = state.turn === BLACK ? 'turn-dot--black' : 'turn-dot--white';
    turnLabelElement.innerHTML = `<span class="turn-indicator"><span class="turn-dot ${colorClass}" aria-hidden="true"></span>${formatPlayer(state.turn)}の手番</span>`;
  }

  function renderStatus() {
    if (!state.mode) {
      renderMenuMessage();
      turnLabelElement.innerHTML = '<span class="turn-indicator"><span class="turn-dot turn-dot--black" aria-hidden="true"></span>黒の手番</span>';
      thinkingLabelElement.hidden = true;
      renderPassOverlay();
      return;
    }

    renderTurnLabel();

    thinkingLabelElement.hidden = !state.thinking || state.passActive || state.gameOver;
    renderPassOverlay();

    if (state.passActive) {
      messageTextElement.textContent = state.passMessage;
    } else if (!state.gameOver) {
      if (isCpuTurn()) {
        messageTextElement.textContent = 'CPU\u304c\u8003\u3048\u3066\u3044\u307e\u3059\u3002';
      } else if (state.mode === 'cpu') {
        messageTextElement.textContent = state.humanColor === BLACK
          ? '\u3042\u306a\u305f\u306f\u9ed2\u3067\u3059\u3002\u7f6e\u3051\u308b\u5834\u6240\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002'
          : '\u3042\u306a\u305f\u306f\u767d\u3067\u3059\u3002CPU\u306e\u5f8c\u3001\u7f6e\u3051\u308b\u5834\u6240\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002';
      } else {
        messageTextElement.textContent = `${formatPlayer(state.turn)}\u306e\u756a\u3067\u3059\u3002`;
      }
    }
  }

  function render() {
    renderScores();
    renderStatus();
    updateBoardView();
    renderDebugPanel();

    if (state.gameOver && state.winner) {
      markWinnerStones(state.winner);
    }
  }

  function bindEvents() {
    twoPlayerButton.addEventListener('click', () => startGame('two', null));

    cpuStartButton.addEventListener('click', () => {
      startGame('cpu', state.cpuLevel, state.humanColor);
    });

    for (const button of sideButtons) {
      button.addEventListener('click', () => {
        state.humanColor = button.dataset.side || BLACK;
        syncMenuSelection();
      });
    }

    for (const button of levelButtons) {
      button.addEventListener('click', () => {
        state.cpuLevel = button.dataset.level || 'easy';
        syncMenuSelection();
      });
    }

    if (debugToggleButton) {
      debugToggleButton.addEventListener('click', () => {
        state.debugMode = !state.debugMode;
        syncMenuSelection();
        render();
      });
    }

    resetButton.addEventListener('click', restartCurrentGame);
    rematchButton.addEventListener('click', restartCurrentGame);
    backToMenuButton.addEventListener('click', returnToMenu);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {
        // The game still works offline without registration succeeding.
      });
    });
  }

  function bootstrap() {
    setupBoardGrid();
    bindEvents();
    registerServiceWorker();
    syncMenuSelection();
    setScreen(false);
    renderMenuMessage();
    render();
  }

  bootstrap();
}());
