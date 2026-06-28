(function () {
  'use strict';

  const BOARD_SIZE = 8;
  const BLACK = 'black';
  const WHITE = 'white';
  const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
  ];
  const X_SQUARES = new Set(['1,1', '1,6', '6,1', '6,6']);
  const C_SQUARES = new Set(['0,1', '1,0', '0,6', '1,7', '6,0', '7,1', '6,7', '7,6']);

  function opposite(color) {
    return color === BLACK ? WHITE : BLACK;
  }

  function inBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function createInitialBoard() {
    const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    return board;
  }

  function collectFlips(board, row, col, color) {
    if (board[row][col] !== null) {
      return [];
    }

    const flips = [];
    const opponent = opposite(color);

    for (const [dr, dc] of DIRECTIONS) {
      const line = [];
      let r = row + dr;
      let c = col + dc;

      while (inBounds(r, c) && board[r][c] === opponent) {
        line.push([r, c]);
        r += dr;
        c += dc;
      }

      if (line.length > 0 && inBounds(r, c) && board[r][c] === color) {
        flips.push(...line);
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

  function applyMove(board, move, color) {
    const nextBoard = cloneBoard(board);
    nextBoard[move.row][move.col] = color;
    for (const [row, col] of move.flips) {
      nextBoard[row][col] = color;
    }
    return nextBoard;
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

  function countMoves(board, color) {
    return getLegalMoves(board, color).length;
  }

  function getGamePhase(board) {
    const totalDiscs = countStones(board).black + countStones(board).white;
    const empties = BOARD_SIZE * BOARD_SIZE - totalDiscs;

    if (empties > 44) {
      return 'early';
    }

    if (empties > 16) {
      return 'mid';
    }

    return 'late';
  }

  function isCorner(row, col) {
    return (row === 0 || row === 7) && (col === 0 || col === 7);
  }

  function isEdge(row, col) {
    return row === 0 || row === 7 || col === 0 || col === 7;
  }

  function isFrontier(board, row, col) {
    for (const [dr, dc] of DIRECTIONS) {
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c) && board[r][c] === null) {
        return true;
      }
    }

    return false;
  }

  function countFrontierDiscs(board, color) {
    let frontier = 0;

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (board[row][col] === color && isFrontier(board, row, col)) {
          frontier += 1;
        }
      }
    }

    return frontier;
  }

  function countCornerDiscs(board, color) {
    const corners = [
      [0, 0], [0, 7], [7, 0], [7, 7],
    ];
    let total = 0;

    for (const [row, col] of corners) {
      if (board[row][col] === color) {
        total += 1;
      }
    }

    return total;
  }

  function countEdgeDiscs(board, color) {
    let total = 0;

    for (let index = 0; index < BOARD_SIZE; index += 1) {
      if (board[0][index] === color) {
        total += 1;
      }
      if (board[7][index] === color) {
        total += 1;
      }
      if (board[index][0] === color) {
        total += 1;
      }
      if (board[index][7] === color) {
        total += 1;
      }
    }

    return total;
  }

  function countApproxStableDiscs(board, color) {
    const stable = new Set();

    function addStable(row, col) {
      stable.add(`${row},${col}`);
    }

    for (const [cornerRow, cornerCol] of [[0, 0], [0, 7], [7, 0], [7, 7]]) {
      if (board[cornerRow][cornerCol] !== color) {
        continue;
      }

      addStable(cornerRow, cornerCol);

      if (cornerRow === 0 && cornerCol === 0) {
        for (let index = 1; index < BOARD_SIZE; index += 1) {
          if (board[0][index] !== color) {
            break;
          }
          addStable(0, index);
        }
        for (let index = 1; index < BOARD_SIZE; index += 1) {
          if (board[index][0] !== color) {
            break;
          }
          addStable(index, 0);
        }
      }

      if (cornerRow === 0 && cornerCol === 7) {
        for (let index = 6; index >= 0; index -= 1) {
          if (board[0][index] !== color) {
            break;
          }
          addStable(0, index);
        }
        for (let index = 1; index < BOARD_SIZE; index += 1) {
          if (board[index][7] !== color) {
            break;
          }
          addStable(index, 7);
        }
      }

      if (cornerRow === 7 && cornerCol === 0) {
        for (let index = 1; index < BOARD_SIZE; index += 1) {
          if (board[7][index] !== color) {
            break;
          }
          addStable(7, index);
        }
        for (let index = 6; index >= 0; index -= 1) {
          if (board[index][0] !== color) {
            break;
          }
          addStable(index, 0);
        }
      }

      if (cornerRow === 7 && cornerCol === 7) {
        for (let index = 6; index >= 0; index -= 1) {
          if (board[7][index] !== color) {
            break;
          }
          addStable(7, index);
        }
        for (let index = 6; index >= 0; index -= 1) {
          if (board[index][7] !== color) {
            break;
          }
          addStable(index, 7);
        }
      }
    }

    return stable.size;
  }

  function positionalScore(board, color) {
    let score = 0;

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (board[row][col] === color) {
          score += window.OthelloAIWeights.POSITION_WEIGHTS[row][col];
        } else if (board[row][col] === opposite(color)) {
          score -= window.OthelloAIWeights.POSITION_WEIGHTS[row][col];
        }
      }
    }

    return score;
  }

  function pieceDifference(board, color) {
    const stones = countStones(board);
    return color === BLACK ? stones.black - stones.white : stones.white - stones.black;
  }

  function mobilityScore(board, color) {
    const myMoves = countMoves(board, color);
    const oppMoves = countMoves(board, opposite(color));
    return myMoves - oppMoves;
  }

  function frontierScore(board, color) {
    const myFrontier = countFrontierDiscs(board, color);
    const oppFrontier = countFrontierDiscs(board, opposite(color));
    return oppFrontier - myFrontier;
  }

  function stableScore(board, color) {
    const myStable = countApproxStableDiscs(board, color);
    const oppStable = countApproxStableDiscs(board, opposite(color));
    return myStable - oppStable;
  }

  function phaseScale(phase) {
    if (phase === 'early') {
      return {
        mobility: window.OthelloAIWeights.EARLY_MOBILITY_MULTIPLIER,
        positional: window.OthelloAIWeights.EARLY_POSITION_MULTIPLIER,
        piece: window.OthelloAIWeights.EARLY_PIECE_MULTIPLIER,
      };
    }

    if (phase === 'mid') {
      return {
        mobility: window.OthelloAIWeights.MID_MOBILITY_MULTIPLIER,
        positional: window.OthelloAIWeights.MID_POSITION_MULTIPLIER,
        piece: window.OthelloAIWeights.MID_PIECE_MULTIPLIER,
      };
    }

    return {
      mobility: window.OthelloAIWeights.LATE_MOBILITY_MULTIPLIER,
      positional: window.OthelloAIWeights.LATE_POSITION_MULTIPLIER,
      piece: window.OthelloAIWeights.LATE_PIECE_MULTIPLIER,
    };
  }

  function evaluateBoard(board, color) {
    const phase = getGamePhase(board);
    const scale = phaseScale(phase);
    const corner = countCornerDiscs(board, color) - countCornerDiscs(board, opposite(color));
    const edge = countEdgeDiscs(board, color) - countEdgeDiscs(board, opposite(color));
    const stable = stableScore(board, color);
    const mobility = mobilityScore(board, color);
    const frontier = frontierScore(board, color);
    const piece = pieceDifference(board, color);
    const positional = positionalScore(board, color);

    const score =
      (corner * window.OthelloAIWeights.CORNER_WEIGHT) +
      (edge * window.OthelloAIWeights.EDGE_WEIGHT) +
      (stable * window.OthelloAIWeights.STABLE_WEIGHT) +
      (mobility * window.OthelloAIWeights.MOBILITY_WEIGHT * scale.mobility) +
      (frontier * window.OthelloAIWeights.FRONTIER_WEIGHT) +
      (piece * window.OthelloAIWeights.PIECE_WEIGHT * scale.piece) +
      (positional * scale.positional);

    return {
      score,
      phase,
      corner,
      edge,
      stable,
      mobility,
      frontier,
      piece,
      positional,
    };
  }

  function evaluateMoveSimple(move) {
    return move.flips.length;
  }

  function evaluateMoveStrong(board, move, color) {
    let score = 0;
    const row = move.row;
    const col = move.col;

    if (isCorner(row, col)) {
      score += 10000;
    } else if (isEdge(row, col)) {
      score += 900;
    }

    if (X_SQUARES.has(`${row},${col}`)) {
      score -= 350;
    }

    if (C_SQUARES.has(`${row},${col}`)) {
      score -= 220;
    }

    const nextBoard = applyMove(board, move, color);
    const mobility = mobilityScore(nextBoard, color);
    const flips = move.flips.length;
    const positional = positionalScore(nextBoard, color);
    const frontier = frontierScore(nextBoard, color);

    score += flips * 32;
    score += mobility * 20;
    score += positional * 2;
    score += frontier * 8;

    return score;
  }

  function exactDiscDifference(board, color) {
    return pieceDifference(board, color) * 1000;
  }

  window.OthelloAIEvaluation = {
    BOARD_SIZE,
    BLACK,
    WHITE,
    opposite,
    inBounds,
    cloneBoard,
    createInitialBoard,
    collectFlips,
    getLegalMoves,
    applyMove,
    countStones,
    getGamePhase,
    evaluateBoard,
    evaluateMoveSimple,
    evaluateMoveStrong,
    exactDiscDifference,
    isCorner,
    isEdge,
    X_SQUARES,
    C_SQUARES,
  };
}());
