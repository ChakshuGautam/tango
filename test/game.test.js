import { TangoSolver } from '../www/game';
import fs from 'fs';
import path from 'path';

describe('TangoSolver', () => {
    let solver;

    beforeEach(() => {
        solver = new TangoSolver(4, []);
    });

    // Unit tests for individual methods
    describe('Core mechanics', () => {
        test('initializes with correct size', () => {
            expect(solver.size).toBe(4);
            expect(solver.grid.length).toBe(4);
            expect(solver.grid[0].length).toBe(4);
        });

        test('setCell updates grid and counts correctly', () => {
            expect(solver.setCell(0, 0, 'S')).toBe(true);
            expect(solver.grid[0][0]).toBe('S');
            expect(solver.rowCounts[0].S).toBe(1);
            expect(solver.colCounts[0].S).toBe(1);
        });

        test('prevents three in a row horizontally', () => {
            solver.setCell(0, 0, 'S');
            solver.setCell(0, 1, 'S');
            expect(solver.setCell(0, 2, 'S')).toBe(false);
        });

        test('prevents three in a row vertically', () => {
            solver.setCell(0, 0, 'S');
            solver.setCell(1, 0, 'S');
            expect(solver.setCell(2, 0, 'S')).toBe(false);
        });

        test('setCell returns false for occupied cells', () => {
            solver.setCell(0, 0, 'S');
            expect(solver.setCell(0, 0, 'M')).toBe(false);
        });

        test('wouldMakeUnbalanced prevents exceeding limits', () => {
            solver.setCell(0, 0, 'S');
            solver.setCell(0, 1, 'S');
            expect(solver.setCell(0, 2, 'S')).toBe(false);
        });
    });

    // Debug and logging tests
    describe('Debug features', () => {
        test('log does nothing when debug is false', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            solver.debug = false;
            solver.log('test');
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('logGrid does nothing when debug is false', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            solver.debug = false;
            solver.logGrid();
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('debug logging works when enabled', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            solver.debug = true;
            solver.log('test message');
            expect(consoleSpy).toHaveBeenCalledWith('test message');
            consoleSpy.mockRestore();
        });
    });

    // E2E tests using actual puzzle files
    describe('End-to-end puzzle solving', () => {
        const puzzlesToTest = ['001']; // Only test puzzle 001 for now

        puzzlesToTest.forEach(puzzleNumber => {
            test(`solves puzzle ${puzzleNumber} correctly`, () => {
                const puzzle = JSON.parse(fs.readFileSync(
                    path.join(__dirname, '../www/games', `${puzzleNumber}.json`),
                    'utf8'
                ));
                const solution = JSON.parse(fs.readFileSync(
                    path.join(__dirname, '../www/games', `${puzzleNumber}.sol.json`),
                    'utf8'
                ));

                const solver = new TangoSolver(puzzle.size, puzzle.constraints);

                // Set initial values
                puzzle.initial.forEach(({ pos: [r, c], value }) => {
                    solver.setCell(r, c, value);
                });

                // Solve the puzzle
                const result = solver.solve();

                // Compare with solution
                solution.grid.forEach((row, r) => {
                    row.forEach((expectedValue, c) => {
                        expect(result[r][c]).toBe(expectedValue);
                    });
                });
            });
        });
    });
}); 