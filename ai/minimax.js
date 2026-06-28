(function () {
  'use strict';

  const Eval = window.OthelloAIEvaluation;
  const TTClass = window.OthelloAITransposition.TranspositionTable;
  const hashBoard = window.OthelloAITransposition.hashBoard;
  const Weights = window.OthelloAIWeights;

  const TT = new TTClass(80000);
  const KILLER_SLOTS = 2;
  const MAX_PLY = 64;

  function moveKey(move) {
    return `${move.row},${move.col}`;
  }

  function moveToText(move) {
    return move ? `${move.row},${move.col}` : 'pass';
  }

  function isMoveEqual(left, right) {
    return left && right && left.row === right.row && left.col === right.col;
  }

  function createSearchContext(rootColor, timeLimitMs, debugEnabled) {
    const deadline = window.performance.now() + timeLimitMs;
    return {
      rootColor,
      deadline,
      debugEnabled: !!debugEnabled,
      nodes: 0,
      timedOut: false,
      killerMoves: Array.from({ length: MAX_PLY }, () => Array(KILLER_SLOTS).fill(null)),
      historyHeuristic: new Map(),
      previousBestMove: null,
      rootCandidates: [],
      pvLine: [],
    };
  }

  function timeExpired(ctx) {
    return window.performance.now() >= ctx.deadline;
  }

  function scoreKillerMove(ctx, move, ply) {
    const killers = ctx.killerMoves[ply] || [];
    for (let index = 0; index < killers.length; index += 1) {
      if (isMoveEqual(move, killers[index])) {
        return (KILLER_SLOTS - index) * 10000;
      }
    }
    return 0;
  }

  function scoreHistoryMove(ctx, move, depth) {
    return ctx.historyHeuristic.get(moveKey(move)) || depth * 10;
  }

  function scoreOrderingMove(board, move, color, ctx, depth, ply) {
    let score = Eval.evaluateMoveStrong(board, move, color);

    if (Eval.isCorner(move.row, move.col)) {
      score += 200000;
    } else if (Eval.isEdge(move.row, move.col)) {
      score += 20000;
    }

    if (ctx.previousBestMove && isMoveEqual(move, ctx.previousBestMove)) {
      score += 60000;
    }

    score += scoreKillerMove(ctx, move, ply);
    score += scoreHistoryMove(ctx, move, depth);

    return score;
  }

  function orderMoves(board, moves, color, ctx, depth, ply) {
    const scored = moves.map((move) => ({
      move,
      score: scoreOrderingMove(board, move, color, ctx, depth, ply),
    }));

    scored.sort((left, right) => right.score - left.score);
    return scored;
  }

  function terminalScore(board, rootColor) {
    return Eval.exactDiscDifference(board, rootColor);
  }

  function evaluateLeaf(board, rootColor) {
    return Eval.evaluateBoard(board, rootColor).score;
  }

  function recordCutoff(ctx, move, depth, ply) {
    const killerRow = ctx.killerMoves[ply];
    if (killerRow) {
      if (!isMoveEqual(killerRow[0], move)) {
        killerRow[1] = killerRow[0];
        killerRow[0] = move;
      }
    }

    const key = moveKey(move);
    const current = ctx.historyHeuristic.get(key) || 0;
    ctx.historyHeuristic.set(key, current + (depth * depth));
  }

  function searchNode(board, color, depth, alpha, beta, rootColor, ctx, ply) {
    if (timeExpired(ctx)) {
      ctx.timedOut = true;
      return { score: evaluateLeaf(board, rootColor), line: [], bestMove: null };
    }

    ctx.nodes += 1;

    const hash = hashBoard(board, color);
    const ttHit = TT.get(hash, depth, alpha, beta);
    if (ttHit && ttHit.bestMove) {
      return {
        score: ttHit.value,
        line: ttHit.bestLine || [],
        bestMove: ttHit.bestMove,
      };
    }

    const legalMoves = Eval.getLegalMoves(board, color);
    const opponentColor = Eval.opposite(color);

    if (legalMoves.length === 0) {
      const opponentMoves = Eval.getLegalMoves(board, opponentColor);
      if (opponentMoves.length === 0) {
        const score = terminalScore(board, rootColor);
        TT.store(hash, depth, score, 'EXACT', null, []);
        return { score, line: [], bestMove: null };
      }

      const passNode = searchNode(board, opponentColor, depth - 1, -beta, -alpha, rootColor, ctx, ply + 1);
      const score = -passNode.score;
      TT.store(hash, depth, score, 'EXACT', null, passNode.line || []);
      return { score, line: passNode.line || [], bestMove: null };
    }

    if (depth <= 0) {
      const score = evaluateLeaf(board, rootColor);
      TT.store(hash, depth, score, 'EXACT', null, []);
      return { score, line: [], bestMove: null };
    }

    const orderedMoves = orderMoves(board, legalMoves, color, ctx, depth, ply);
    let bestScore = -Infinity;
    let bestMove = null;
    let bestLine = [];
    const originalAlpha = alpha;

    for (const item of orderedMoves) {
      if (timeExpired(ctx)) {
        ctx.timedOut = true;
        break;
      }

      const nextBoard = Eval.applyMove(board, item.move, color);
      const child = searchNode(nextBoard, opponentColor, depth - 1, -beta, -alpha, rootColor, ctx, ply + 1);
      const score = -child.score;

      if (score > bestScore) {
        bestScore = score;
        bestMove = item.move;
        bestLine = [item.move].concat(child.line || []);
      }

      if (score > alpha) {
        alpha = score;
      }

      if (alpha >= beta) {
        recordCutoff(ctx, item.move, depth, ply);
        break;
      }
    }

    if (bestScore === -Infinity) {
      bestScore = evaluateLeaf(board, rootColor);
    }

    let flag = 'EXACT';
    if (bestScore <= originalAlpha) {
      flag = 'UPPER';
    } else if (bestScore >= beta) {
      flag = 'LOWER';
    }

    TT.store(hash, depth, bestScore, flag, bestMove, bestLine);

    return {
      score: bestScore,
      line: bestLine,
      bestMove,
    };
  }

  function searchDepth(board, color, depth, ctx) {
    const hash = hashBoard(board, color);
    const legalMoves = Eval.getLegalMoves(board, color);
    const orderedMoves = orderMoves(board, legalMoves, color, ctx, depth, 0);
    const opponentColor = Eval.opposite(color);
    let bestMove = null;
    let bestScore = -Infinity;
    let bestLine = [];
    let alpha = -Infinity;
    const beta = Infinity;
    const candidates = [];

    for (const item of orderedMoves) {
      if (timeExpired(ctx)) {
        ctx.timedOut = true;
        break;
      }

      const nextBoard = Eval.applyMove(board, item.move, color);
      const child = searchNode(nextBoard, opponentColor, depth - 1, -beta, -alpha, color, ctx, 1);
      const score = -child.score;
      candidates.push({
        move: moveToText(item.move),
        score,
        orderingScore: item.score,
      });

      if (score > bestScore) {
        bestScore = score;
        bestMove = item.move;
        bestLine = [item.move].concat(child.line || []);
      }

      if (score > alpha) {
        alpha = score;
      }
    }

    let flag = 'EXACT';
    if (bestScore === -Infinity) {
      bestScore = evaluateLeaf(board, color);
      flag = 'EXACT';
    }

    TT.store(hash, depth, bestScore, flag, bestMove, bestLine);

    return {
      score: bestScore,
      move: bestMove,
      line: bestLine,
      depth,
      candidates,
    };
  }

  function searchToDepth(board, color, depth, ctx) {
    const result = searchDepth(board, color, depth, ctx);
    return {
      score: result.score,
      move: result.move,
      line: result.line || [],
      depth,
      candidates: result.candidates || [],
    };
  }

  function solveEndgame(board, color, ctx) {
    const totalDiscs = Eval.countStones(board).black + Eval.countStones(board).white;
    const empties = (Eval.BOARD_SIZE * Eval.BOARD_SIZE) - totalDiscs;
    const depth = empties + 2;
    const result = searchToDepth(board, color, depth, ctx);
    result.reason = 'endgame-solver';
    return result;
  }

  function chooseLevel3Move(board, color, legalMoves) {
    let bestMove = legalMoves[0];
    let bestScore = -Infinity;

    for (const move of legalMoves) {
      let score = Eval.evaluateMoveStrong(board, move, color);
      if (Eval.isCorner(move.row, move.col)) {
        score += 100000;
      } else if (Eval.isEdge(move.row, move.col)) {
        score += 5000;
      }
      if (Eval.X_SQUARES.has(`${move.row},${move.col}`)) {
        score -= 5000;
      }
      if (Eval.C_SQUARES.has(`${move.row},${move.col}`)) {
        score -= 2500;
      }
      score -= move.flips.length * 25;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return {
      move: bestMove,
      score: bestScore,
      reason: 'level3-heuristic',
      candidates: legalMoves.map((move) => ({
        move: moveToText(move),
        score: Eval.evaluateMoveStrong(board, move, color),
      })),
    };
  }

  function chooseLevel2Move(legalMoves) {
    let bestMove = legalMoves[0];
    for (const move of legalMoves) {
      if (move.flips.length > bestMove.flips.length) {
        bestMove = move;
      }
    }
    return {
      move: bestMove,
      score: bestMove.flips.length,
      reason: 'level2-max-flips',
      candidates: legalMoves.map((move) => ({
        move: moveToText(move),
        score: move.flips.length,
      })),
    };
  }

  function chooseLevel1Move(legalMoves) {
    const move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    return {
      move,
      score: move ? move.flips.length : 0,
      reason: 'level1-random',
      candidates: legalMoves.map((item) => ({
        move: moveToText(item),
        score: item.flips.length,
      })),
    };
  }

  function chooseSearchDepth(level, phase, empties) {
    if (level === 'expert') {
      if (phase === 'early') {
        return Weights.LEVEL4_DEPTH_EARLY;
      }
      if (phase === 'mid') {
        return Weights.LEVEL4_DEPTH_MID;
      }
      return Weights.LEVEL4_DEPTH_LATE;
    }

    if (empties <= Weights.ENDGAME_SOLVE_THRESHOLD) {
      return empties + 2;
    }

    if (phase === 'early') {
      return 5;
    }

    if (phase === 'mid') {
      return 6;
    }

    return 7;
  }

  function iterativeDeepening(board, color, level, ctx, limitDepth) {
    let bestResult = null;
    let bestCompletedDepth = 0;

    for (let depth = 1; depth <= limitDepth; depth += 1) {
      ctx.previousBestMove = bestResult ? bestResult.move : null;
      const result = searchToDepth(board, color, depth, ctx);
      if (ctx.timedOut) {
        break;
      }

      bestResult = result;
      bestCompletedDepth = depth;
    }

    if (!bestResult) {
      const legalMoves = Eval.getLegalMoves(board, color);
      return legalMoves[0] || null;
    }

    return {
      ...bestResult,
      depth: bestCompletedDepth,
    };
  }

  function chooseLevel4Move(board, color, history, debugEnabled) {
    const legalMoves = Eval.getLegalMoves(board, color);
    if (legalMoves.length === 0) {
      return null;
    }

    const phase = Eval.getGamePhase(board);
    const totalDiscs = Eval.countStones(board).black + Eval.countStones(board).white;
    const empties = (Eval.BOARD_SIZE * Eval.BOARD_SIZE) - totalDiscs;
    const ctx = createSearchContext(color, Weights.LEVEL4_TIME_LIMIT_MS, debugEnabled);
    const book = window.OthelloAIOpeningBook.lookup(history, legalMoves);
    if (book) {
      return {
        ...book,
        depth: 1,
        nodes: 0,
        timeMs: 0,
        candidates: legalMoves.map((move) => ({ move: moveToText(move), score: 0 })),
      };
    }

    if (empties <= Weights.ENDGAME_SOLVE_THRESHOLD) {
      const solved = solveEndgame(board, color, ctx);
      return {
        ...solved,
        nodes: ctx.nodes,
        timeMs: Math.max(1, Math.round(window.performance.now() - (ctx.deadline - Weights.LEVEL4_TIME_LIMIT_MS))),
        reason: 'endgame-solver',
      };
    }

    const maxDepth = chooseSearchDepth('expert', phase, empties);
    const start = window.performance.now();
    const result = iterativeDeepening(board, color, 'expert', ctx, maxDepth);
    const timeMs = Math.round(window.performance.now() - start);
    const finalMove = result && result.move ? result.move : legalMoves[0];

    return {
      move: finalMove,
      score: result ? result.score : 0,
      depth: result ? result.depth : 1,
      line: result ? result.line : [],
      nodes: ctx.nodes,
      timeMs,
      reason: 'alpha-beta-evaluation',
      candidates: result ? result.candidates : [],
    };
  }

  function chooseLevel5Move(board, color, history, debugEnabled) {
    const legalMoves = Eval.getLegalMoves(board, color);
    if (legalMoves.length === 0) {
      return null;
    }

    const phase = Eval.getGamePhase(board);
    const totalDiscs = Eval.countStones(board).black + Eval.countStones(board).white;
    const empties = (Eval.BOARD_SIZE * Eval.BOARD_SIZE) - totalDiscs;
    const ctx = createSearchContext(color, empties <= Weights.ENDGAME_SOLVE_THRESHOLD ? Weights.LEVEL5_ENDGAME_TIME_LIMIT_MS : Weights.LEVEL5_TIME_LIMIT_MS, debugEnabled);

    const book = window.OthelloAIOpeningBook.lookup(history, legalMoves);
    if (book) {
      return {
        ...book,
        depth: 1,
        nodes: 0,
        timeMs: 0,
        candidates: legalMoves.map((move) => ({ move: moveToText(move), score: 0 })),
      };
    }

    if (empties <= Weights.ENDGAME_SOLVE_THRESHOLD) {
      const start = window.performance.now();
      const solved = solveEndgame(board, color, ctx);
      const timeMs = Math.round(window.performance.now() - start);
      return {
        ...solved,
        nodes: ctx.nodes,
        timeMs,
        reason: 'endgame-solver',
      };
    }

    const maxDepth = chooseSearchDepth('master', phase, empties);
    const start = window.performance.now();
    const result = iterativeDeepening(board, color, 'master', ctx, maxDepth);
    const timeMs = Math.round(window.performance.now() - start);
    const finalMove = result && result.move ? result.move : legalMoves[0];

    return {
      move: finalMove,
      score: result ? result.score : 0,
      depth: result ? result.depth : 1,
      line: result ? result.line : [],
      nodes: ctx.nodes,
      timeMs,
      reason: 'iterative-deepening',
      candidates: result ? result.candidates : [],
    };
  }

  window.OthelloAIMinimax = {
    TT,
    moveToText,
    chooseLevel1Move,
    chooseLevel2Move,
    chooseLevel3Move,
    chooseLevel4Move,
    chooseLevel5Move,
    createSearchContext,
    chooseSearchDepth,
    searchToDepth,
    solveEndgame,
  };
}());
