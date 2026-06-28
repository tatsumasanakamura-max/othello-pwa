(function () {
  'use strict';

  const Eval = window.OthelloAIEvaluation;
  const AI = window.OthelloAI;

  window.OthelloGameAI = {
    getLegalMoves: Eval.getLegalMoves,
    chooseMove(board, color, level, options) {
      return AI.chooseMove(board, color, level, options);
    },
  };
}());
