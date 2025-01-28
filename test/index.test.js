import { PuzzleRenderer } from '../www/index';

// Mock puzzle data
const mockPuzzle = {
    size: 4,
    constraints: [],
    initial: [],
    number: 1
};

describe('PuzzleRenderer', () => {
    let renderer;

    beforeEach(() => {
        // Reset the document body
        document.body.innerHTML = `
            <div id="gridContainer"></div>
            <div id="timer">00:00</div>
            <select id="puzzleSelect"></select>
            <input type="checkbox" id="showErrors" checked>
            <button id="solveBtn">Solve</button>
            <button id="clearBtn">Clear</button>
        `;

        // Mock fetch
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockPuzzle)
            })
        );

        // Create renderer
        renderer = new PuzzleRenderer();

        // Initialize after DOM is ready
        renderer.initialize();
    });

    afterEach(() => {
        // Clean up
        document.body.innerHTML = '';
        jest.restoreAllMocks();
        jest.clearAllTimers();
    });

    test('initializes correctly', async () => {
        expect(renderer.gridContainer).toBeTruthy();
        expect(renderer.puzzleSelect).toBeTruthy();
        expect(renderer.timer).toBeTruthy();
    });

    test('handles cell clicks correctly', async () => {
        await renderer.loadPuzzle(1);
        const cell = renderer.gridContainer.querySelector('button');

        // Click to add Sun
        cell.click();
        expect(cell.dataset.value).toBe('S');

        // Click to change to Moon
        cell.click();
        expect(cell.dataset.value).toBe('M');

        // Click to clear
        cell.click();
        expect(cell.dataset.value).toBeUndefined();

        // Click to add Sun again
        cell.click();
        expect(cell.dataset.value).toBe('S');
    });

    test('timer starts on first move', async () => {
        await renderer.loadPuzzle(1);
        const cell = renderer.gridContainer.querySelector('button');

        expect(renderer.timerStarted).toBe(false);
        cell.click();
        expect(renderer.timerStarted).toBe(true);
    });

    test('error checking works correctly', async () => {
        await renderer.loadPuzzle(1);
        const cells = renderer.gridContainer.querySelectorAll('button');

        // Create three in a row
        cells[0].click(); // S
        await new Promise(resolve => setTimeout(resolve, 0));
        cells[1].click(); // S
        await new Promise(resolve => setTimeout(resolve, 0));
        cells[2].click(); // S
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(cells[0].parentElement.classList.contains('error-cell')).toBe(true);
        expect(cells[1].parentElement.classList.contains('error-cell')).toBe(true);
        expect(cells[2].parentElement.classList.contains('error-cell')).toBe(true);
    });

    test('puzzle selector changes load new puzzles', async () => {
        const newMockPuzzle = { ...mockPuzzle, number: 2 };
        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(newMockPuzzle)
            })
        );

        const select = document.getElementById('puzzleSelect');
        select.value = '2';
        select.dispatchEvent(new Event('change'));

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(global.fetch).toHaveBeenCalledWith('games/002.json');
    });

    test('solve button works correctly', async () => {
        // Create a simple solvable puzzle with constraints to ensure solver works
        const solvablePuzzle = {
            size: 2,
            constraints: [
                { type: '=', cells: [[0, 0], [0, 1]] }  // Force cells to be equal
            ],
            initial: [
                { pos: [0, 0], value: 'S' }  // Initial value forces a solution
            ]
        };

        // Mock fetch for this specific test
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(solvablePuzzle)
            })
        );

        await renderer.loadPuzzle(1);

        // Verify initial state
        const cells = renderer.gridContainer.getElementsByTagName('button');
        expect(cells[0].dataset.value).toBe('S');
        expect(cells[1].dataset.value).toBeUndefined();

        // Solve
        const solveBtn = document.getElementById('solveBtn');
        solveBtn.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        // With the equality constraint and initial S, cell[1] must be S
        expect(cells[1].dataset.value).toBe('S');
    });

    test('clear button resets the grid', async () => {
        // Start with empty puzzle
        const emptyPuzzle = {
            size: 2,
            constraints: [],
            initial: []
        };

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(emptyPuzzle)
            })
        );

        await renderer.loadPuzzle(1);

        // Add a value
        const cells = renderer.gridContainer.querySelectorAll('button');
        const cell = cells[0];

        // Verify initial empty state
        expect(cell.dataset.value).toBeUndefined();
        expect(renderer.solver.grid[0][0]).toBeNull();

        // Add a value
        cell.click();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(cell.dataset.value).toBe('S');
        expect(renderer.solver.grid[0][0]).toBe('S');

        // Clear the grid
        const clearBtn = document.getElementById('clearBtn');
        clearBtn.click();

        // Need to re-render the grid to see changes
        await renderer.renderGrid();

        // Get the new button after re-render
        const newCells = renderer.gridContainer.querySelectorAll('button');
        expect(newCells[0].dataset.value).toBeUndefined();
        expect(renderer.solver.grid[0][0]).toBeNull();
    });

    test('handles failed puzzle loads', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false
            })
        );

        await renderer.loadPuzzle(999);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('show errors checkbox toggles error display', async () => {
        await renderer.loadPuzzle(1);
        const cells = renderer.gridContainer.querySelectorAll('button');

        // Create three in a row
        cells[0].click(); // S
        await new Promise(resolve => setTimeout(resolve, 0));
        cells[1].click(); // S
        await new Promise(resolve => setTimeout(resolve, 0));
        cells[2].click(); // S
        await new Promise(resolve => setTimeout(resolve, 0));

        const showErrors = document.getElementById('showErrors');
        showErrors.checked = false;
        showErrors.dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(cells[0].parentElement.classList.contains('error-cell')).toBe(false);

        showErrors.checked = true;
        showErrors.dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(cells[0].parentElement.classList.contains('error-cell')).toBe(true);
    });

    test('timer formatting works correctly', async () => {
        jest.useFakeTimers();
        await renderer.loadPuzzle(1);

        const cell = renderer.gridContainer.querySelector('button');
        cell.click(); // Start timer

        jest.advanceTimersByTime(65000); // Advance 65 seconds
        expect(renderer.timer.textContent).toBe('01:05');

        jest.useRealTimers();
    });

    test('constraint rendering works correctly', async () => {
        const puzzleWithConstraints = {
            ...mockPuzzle,
            constraints: [
                { type: '=', cells: [[0, 0], [0, 1]] },
                { type: '×', cells: [[1, 0], [2, 0]] }
            ]
        };

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(puzzleWithConstraints)
            })
        );

        await renderer.loadPuzzle(1);
        const markers = document.getElementsByClassName('constraint-marker');
        expect(markers.length).toBe(2);
        expect(markers[0].textContent).toBe('=');
        expect(markers[1].textContent).toBe('×');
    });

    test('handles initial values correctly', async () => {
        const puzzleWithInitial = {
            ...mockPuzzle,
            initial: [{ pos: [0, 0], value: 'S' }]
        };

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(puzzleWithInitial)
            })
        );

        await renderer.loadPuzzle(1);
        const initialCell = renderer.gridContainer.querySelector('button');
        expect(initialCell.classList.contains('initial-value')).toBe(true);
        expect(initialCell.dataset.value).toBe('S');
    });

    test('handles constraint lines correctly', async () => {
        const puzzleWithConstraints = {
            ...mockPuzzle,
            constraints: [
                { type: '=', cells: [[0, 0], [0, 1]] },
                { type: '×', cells: [[1, 0], [2, 0]] }
            ]
        };

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(puzzleWithConstraints)
            })
        );

        await renderer.loadPuzzle(1);
        const lines = document.querySelectorAll('.bg-gray-400');
        expect(lines.length).toBeGreaterThan(0);
    });

    test('initial values cannot be changed', async () => {
        const puzzleWithInitial = {
            ...mockPuzzle,
            initial: [{ pos: [0, 0], value: 'S' }]
        };

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(puzzleWithInitial)
            })
        );

        await renderer.loadPuzzle(1);
        const initialCell = renderer.gridContainer.querySelector('button');
        initialCell.click();
        expect(initialCell.dataset.value).toBe('S');
    });

    test('solveCurrent does nothing without solver', () => {
        renderer.solver = null;
        renderer.solveCurrent();
        // Should not throw error
    });
}); 