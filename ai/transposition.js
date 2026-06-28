(function () {
  'use strict';

  const BOARD_SIZE = 8;
  const BLACK = 'black';
  const WHITE = 'white';
  const TURN_KEYS = {
    black: 0x9e3779b97f4a7c15n,
    white: 0xc2b2ae3d27d4eb4fn,
  };

  function createRandomBigInt() {
    const buffer = new Uint32Array(2);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(buffer);
    } else {
      buffer[0] = Math.floor(Math.random() * 0xffffffff);
      buffer[1] = Math.floor(Math.random() * 0xffffffff);
    }

    return (BigInt(buffer[0]) << 32n) | BigInt(buffer[1]);
  }

  function buildZobristTable() {
    const table = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      const rowEntries = [];
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        rowEntries.push([createRandomBigInt(), createRandomBigInt()]);
      }
      table.push(rowEntries);
    }
    return table;
  }

  function hashBoard(board, turn) {
    let hash = 0n;

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const cell = board[row][col];
        if (cell === BLACK) {
          hash ^= window.OthelloAITransposition.zobrist[row][col][0];
        } else if (cell === WHITE) {
          hash ^= window.OthelloAITransposition.zobrist[row][col][1];
        }
      }
    }

    hash ^= TURN_KEYS[turn] || 0n;
    return hash.toString(16);
  }

  class TranspositionTable {
    constructor(limit) {
      this.limit = limit || 50000;
      this.map = new Map();
    }

    get(hash, depth, alpha, beta) {
      const entry = this.map.get(hash);
      if (!entry || entry.depth < depth) {
        return null;
      }

      if (entry.flag === 'EXACT') {
        return entry;
      }

      if (entry.flag === 'LOWER' && entry.value >= beta) {
        return entry;
      }

      if (entry.flag === 'UPPER' && entry.value <= alpha) {
        return entry;
      }

      return null;
    }

    store(hash, depth, value, flag, bestMove, bestLine) {
      if (this.map.size >= this.limit) {
        const oldest = this.map.keys().next().value;
        if (oldest !== undefined) {
          this.map.delete(oldest);
        }
      }

      this.map.set(hash, {
        depth,
        value,
        flag,
        bestMove,
        bestLine: bestLine || [],
      });
    }

    clear() {
      this.map.clear();
    }
  }

  window.OthelloAITransposition = {
    zobrist: buildZobristTable(),
    hashBoard,
    TranspositionTable,
  };
}());
