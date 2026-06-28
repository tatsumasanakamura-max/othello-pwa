/* global window */

(function () {
  const BOARD_SIZE = 8;
  const BLACK = 'black';
  const WHITE = 'white';

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function opposite(color) {
    return color === BLACK ? WHITE : BLACK;
  }

  function inBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function collectFlips(board, row, col, color) {
    if (board[row][col] !== null) {
      return [];
    }

    const opponent = opposite(color);
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1],
    ];
    const flips = [];

    for (const [dr, dc] of directions) {
      const path = [];
      let r = row + dr;
      let c = col + dc;

      while (inBounds(r, c) && board[r][c] === opponent) {
        path.push([r, c]);
        r += dr;
        c += dc;
      }

      if (path.length > 0 && inBounds(r, c) && board[r][c] === color) {
        flips.push(...path);
      }
    }

    return flips;
  }

  function getLegalMoves(board, color) {
    const moves = [];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const flips = collectFlips(board, row, col, color);
        if (flips.length > 0) {
          moves.push({ row, col, flips });
        }
      }
    }

    return moves;
  }

  function evaluateCornerPressure(board, color) {
    const opponentMoves = getLegalMoves(board, opposite(color));
    let corners = 0;

    for (const move of opponentMoves) {
      if ((move.row === 0 || move.row === 7) && (move.col === 0 || move.col === 7)) {
        corners += 1;
      }
    }

    return corners;
  }

  function isCorner(row, col) {
    return (row === 0 || row === 7) && (col === 0 || col === 7);
  }

  function isEdge(row, col) {
    return row === 0 || row === 7 || col === 0 || col === 7;
  }

  function isDangerSquare(row, col) {
    const danger = new Set([
      '0,1', '1,0', '1,1', '0,6', '1,6', '1,7',
      '6,0', '6,1', '7,1', '6,6', '6,7', '7,6',
    ]);
    return danger.has(`${row},${col}`);
  }

  function scoreMove(board, move, color) {
    let score = 0;

    if (isCorner(move.row, move.col)) {
      score += 10000;
    } else if (isEdge(move.row, move.col)) {
      score += 1000;
    }

    score += move.flips.length * 40;

    const nextBoard = cloneBoard(board);
    nextBoard[move.row][move.col] = color;
    for (const [r, c] of move.flips) {
      nextBoard[r][c] = color;
    }

    const opponentMoves = getLegalMoves(nextBoard, opposite(color)).length;
    score -= opponentMoves * 30;

    const dangerPenalty = isDangerSquare(move.row, move.col) ? 220 : 0;
    score -= dangerPenalty;

    const cornerPressure = evaluateCornerPressure(nextBoard, color);
    score -= cornerPressure * 500;

    return score;
  }

  function chooseRandomMove(moves) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  function chooseNormalMove(moves) {
    let best = moves[0];

    for (const move of moves) {
      if (move.flips.length > best.flips.length) {
        best = move;
      }
    }

    return best;
  }

  function chooseHardMove(board, moves, color) {
    let best = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      const score = scoreMove(board, move, color);
      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
    }

    return best;
  }

  window.OthelloGameAI = {
    getLegalMoves,
    chooseMove(board, color, level) {
      const moves = getLegalMoves(board, color);
      if (moves.length === 0) {
        return null;
      }

      if (level === 'easy') {
        return chooseRandomMove(moves);
      }

      if (level === 'normal') {
        return chooseNormalMove(moves);
      }

      return chooseHardMove(board, moves, color);
    },
  };
}());
