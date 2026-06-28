(function () {
  'use strict';

  const BOOK = [
    {
      name: 'start-d3',
      sequence: [],
      reply: '2,3',
    },
    {
      name: 'classic-d3',
      sequence: ['2,3'],
      reply: '2,2',
    },
    {
      name: 'classic-c4',
      sequence: ['3,2'],
      reply: '2,2',
    },
    {
      name: 'classic-f5',
      sequence: ['4,5'],
      reply: '5,5',
    },
    {
      name: 'classic-e6',
      sequence: ['5,4'],
      reply: '5,5',
    },
    {
      name: 'variation-d3-c3',
      sequence: ['2,3', '2,2'],
      reply: '2,1',
    },
    {
      name: 'variation-c4-c3',
      sequence: ['3,2', '2,2'],
      reply: '2,1',
    },
    {
      name: 'variation-f5-f6',
      sequence: ['4,5', '5,5'],
      reply: '5,6',
    },
    {
      name: 'variation-e6-f6',
      sequence: ['5,4', '5,5'],
      reply: '5,6',
    },
  ];

  function matches(history, sequence) {
    if (history.length < sequence.length) {
      return false;
    }

    for (let index = 0; index < sequence.length; index += 1) {
      if (history[index] !== sequence[index]) {
        return false;
      }
    }

    return true;
  }

  function lookup(history, legalMoves) {
    if (!history || history.length > 10) {
      return null;
    }

    for (const entry of BOOK) {
      if (!matches(history, entry.sequence)) {
        continue;
      }

      const [row, col] = entry.reply.split(',').map((value) => Number(value));
      const move = legalMoves.find((item) => item.row === row && item.col === col);
      if (move) {
        return {
          move,
          reason: `opening-book:${entry.name}`,
          source: 'openingBook',
        };
      }
    }

    return null;
  }

  window.OthelloAIOpeningBook = {
    book: BOOK,
    lookup,
  };
}());
