const { TangoSolver } = require('./game');
const fs = require('fs');
const path = require('path');

// Load test data
const puzzle = JSON.parse(fs.readFileSync(path.join(__dirname, 'games/001.json'), 'utf8'));
const solution = JSON.parse(fs.readFileSync(path.join(__dirname, 'games/001.sol.json'), 'utf8'));

// Test the solver
function testPuzzle001() {
    const solver = new TangoSolver(puzzle.size, puzzle.constraints);
    solver.debug = true;  // Enable debugging

    // Set initial values
    puzzle.initial.forEach(({ pos: [r, c], value }) => {
        solver.setCell(r, c, value);
    });

    console.log("Initial state:");
    solver.logGrid();

    // Solve the puzzle
    const result = solver.solve();

    // Compare with solution
    const matches = solution.grid.every((row, r) =>
        row.every((cell, c) => result[r][c] === cell)
    );

    if (matches) {
        console.log('✅ Puzzle 001 solved correctly');
    } else {
        console.log('❌ Puzzle 001 solution does not match');
        console.log('Expected:');
        console.log(solution.grid);
        console.log('Got:');
        console.log(result);
    }
}

testPuzzle001(); 