(function () {
  'use strict';

  const Eval = window.OthelloAIEvaluation;
  const Minimax = window.OthelloAIMinimax;

  function normalizeLevel(level) {
    if (level === 'easy' || level === 'normal' || level === 'strong' || level === 'expert' || level === 'master') {
      return level;
    }

    if (level === 'hard') {
      return 'strong';
    }

    return 'easy';
  }

  function createDebugInfo(result) {
    if (!result) {
      return null;
    }

    const candidates = (result.candidates || []).slice(0, 5).map((item) => `${item.move}:${Math.round(item.score)}`);
    return {
      depth: result.depth || 0,
      score: Math.round(result.score || 0),
      nodes: result.nodes || 0,
      timeMs: result.timeMs || 0,
      reason: result.reason || '',
      candidates: candidates.join(' / '),
    };
  }

  function chooseMove(board, color, rawLevel, options) {
    const level = normalizeLevel(rawLevel);
    const legalMoves = Eval.getLegalMoves(board, color);
    const history = (options && options.history) || [];
    const debugEnabled = !!(options && options.debug);

    if (legalMoves.length === 0) {
      return {
        move: null,
        score: 0,
        depth: 0,
        nodes: 0,
        timeMs: 0,
        reason: 'no-legal-moves',
        candidates: [],
        debug: null,
      };
    }

    let result;

    if (level === 'easy') {
      result = Minimax.chooseLevel1Move(legalMoves);
      result.timeMs = 0;
      result.nodes = 0;
      result.depth = 1;
    } else if (level === 'normal') {
      result = Minimax.chooseLevel2Move(legalMoves);
      result.timeMs = 0;
      result.nodes = 0;
      result.depth = 1;
    } else if (level === 'strong') {
      result = Minimax.chooseLevel3Move(board, color, legalMoves);
      result.timeMs = 0;
      result.nodes = 0;
      result.depth = 1;
    } else if (level === 'expert') {
      result = Minimax.chooseLevel4Move(board, color, history, debugEnabled);
    } else {
      result = Minimax.chooseLevel5Move(board, color, history, debugEnabled);
    }

    if (!result) {
      const fallbackMove = legalMoves[0];
      result = {
        move: fallbackMove,
        score: 0,
        depth: 1,
        nodes: 0,
        timeMs: 0,
        reason: 'fallback',
        candidates: [],
      };
    }

    return {
      move: result.move,
      score: result.score || 0,
      depth: result.depth || 0,
      nodes: result.nodes || 0,
      timeMs: result.timeMs || 0,
      reason: result.reason || '',
      candidates: result.candidates || [],
      debug: debugEnabled ? createDebugInfo(result) : null,
    };
  }

  window.OthelloAI = {
    chooseMove,
  };
}());
