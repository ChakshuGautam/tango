import { TangoSolver } from './game';
import './styles.css';

class PuzzleRenderer {
    constructor() {
        this.gridContainer = null;
        this.puzzleSelect = null;
        this.currentPuzzle = null;
        this.solver = null;
        this.timer = null;
        this.timerInterval = null;
        this.startTime = null;
        this.timerStarted = false;
        this.showErrors = null;
    }

    initialize() {
        // Add error cell style
        const style = document.createElement('style');
        style.textContent = `
            .error-cell {
                background-color: rgba(239, 68, 68, 0.2); /* red-500 with opacity */
            }
        `;
        document.head.appendChild(style);

        // Initialize DOM elements
        this.gridContainer = document.getElementById('gridContainer');
        this.puzzleSelect = document.getElementById('puzzleSelect');
        this.timer = document.getElementById('timer');
        this.showErrors = document.getElementById('showErrors');

        if (!this.gridContainer || !this.puzzleSelect || !this.timer || !this.showErrors) {
            throw new Error('Required DOM elements not found');
        }

        // Add event listeners
        this.showErrors.addEventListener('change', () => this.checkErrors());

        // Initialize puzzle selector
        this.initPuzzleSelector();
        this.loadPuzzle(1); // Load puzzle #1 by default
    }

    initPuzzleSelector() {
        for (let i = 1; i <= 100; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Puzzle #${i}`;
            this.puzzleSelect.appendChild(option);
        }
        this.puzzleSelect.addEventListener('change', (e) => {
            this.loadPuzzle(parseInt(e.target.value));
        });
    }

    async loadPuzzle(number) {
        this.resetTimer();
        try {
            // Load puzzle from the games folder
            const response = await fetch(`games/${String(number).padStart(3, '0')}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load puzzle ${number}`);
            }
            this.currentPuzzle = await response.json();

            // Create new solver instance for this puzzle
            this.solver = new TangoSolver(this.currentPuzzle.size, this.currentPuzzle.constraints);

            // Set initial values
            this.currentPuzzle.initial.forEach(({ pos: [r, c], value }) => {
                this.solver.setCell(r, c, value);
            });

            this.renderGrid();
            this.checkErrors();
        } catch (error) {
            console.error(`Error loading puzzle ${number}:`, error);
        }
    }

    renderGrid() {
        this.gridContainer.innerHTML = '';
        this.gridContainer.className = `grid-container`;
        this.gridContainer.style.gridTemplateColumns = `repeat(${this.currentPuzzle.size}, minmax(0, 1fr))`;

        // Create grid cells
        for (let r = 0; r < this.currentPuzzle.size; r++) {
            for (let c = 0; c < this.currentPuzzle.size; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';

                const button = document.createElement('button');
                button.className = 'w-full h-full aspect-square flex items-center justify-center relative';
                button.dataset.row = r;
                button.dataset.col = c;

                // Add initial values
                const value = this.solver.grid[r][c];
                if (value) {
                    this.setCellValue(button, value);
                    button.classList.add('initial-value');
                } else {
                    // Add click handler only for non-initial cells
                    button.addEventListener('click', (e) => this.handleCellClick(e));
                }

                // Add constraints - only add marker between cells
                this.currentPuzzle.constraints.forEach(constraint => {
                    const [[r1, c1], [r2, c2]] = constraint.cells;
                    // Only add marker at the midpoint between constrained cells
                    if (r1 === r2) { // Horizontal constraint
                        if (r === r1 && c === Math.min(c1, c2)) {
                            const marker = document.createElement('div');
                            marker.className = 'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 text-lg font-bold bg-white rounded-full px-1 constraint-marker';
                            marker.textContent = constraint.type;
                            cell.appendChild(marker);
                        }
                    } else if (c1 === c2) { // Vertical constraint
                        if (c === c1 && r === Math.min(r1, r2)) {
                            const marker = document.createElement('div');
                            marker.className = 'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20 text-lg font-bold bg-white rounded-full px-1 constraint-marker';
                            marker.textContent = constraint.type;
                            cell.appendChild(marker);
                        }
                    }
                });

                // Add constraint lines
                this.currentPuzzle.constraints.forEach(constraint => {
                    const isPartOfConstraint = constraint.cells.some(([cr, cc]) => cr === r && cc === c);
                    if (isPartOfConstraint) {
                        const [[r1, c1], [r2, c2]] = constraint.cells;
                        if (r1 === r2) { // Horizontal constraint
                            if (c === Math.min(c1, c2)) {
                                const line = document.createElement('div');
                                line.className = 'absolute right-0 top-1/2 h-0.5 bg-gray-400 transform translate-x-full';
                                line.style.width = '100%';
                                cell.appendChild(line);
                            }
                        } else if (c1 === c2) { // Vertical constraint
                            if (r === Math.min(r1, r2)) {
                                const line = document.createElement('div');
                                line.className = 'absolute bottom-0 left-1/2 w-0.5 bg-gray-400 transform translate-y-full';
                                line.style.height = '100%';
                                cell.appendChild(line);
                            }
                        }
                    }
                });

                cell.appendChild(button);
                this.gridContainer.appendChild(cell);
            }
        }
    }

    handleCellClick(e) {
        // Start timer on first cell click
        this.startTimer();

        const button = e.currentTarget;
        if (button.classList.contains('initial-value')) return;

        const currentValue = button.dataset.value || null;
        const r = parseInt(button.dataset.row);
        const c = parseInt(button.dataset.col);

        let newValue;
        if (!currentValue) {
            newValue = 'S';
        } else if (currentValue === 'S') {
            newValue = 'M';
        } else if (currentValue === 'M') {
            newValue = null;
            // Clear the dataset value to allow future clicks
            delete button.dataset.value;
        }

        // Update the solver's grid
        this.solver.grid[r][c] = newValue;

        // Reset counts for the current position
        if (currentValue) {
            this.solver.rowCounts[r][currentValue]--;
            this.solver.colCounts[c][currentValue]--;
        }

        // Add counts for new value if it exists
        if (newValue) {
            this.solver.rowCounts[r][newValue]++;
            this.solver.colCounts[c][newValue]++;
        }

        this.setCellValue(button, newValue);
        this.checkErrors();
    }

    setCellValue(button, value) {
        button.innerHTML = '';

        // Only set dataset.value if we have a value, otherwise remove it
        if (value) {
            button.dataset.value = value;
        } else {
            delete button.dataset.value;
        }

        if (value === 'S') {
            button.innerHTML = '<div class="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-500"></div>';
        } else if (value === 'M') {
            button.innerHTML = '<img width="30" src="moon.png">';
        }
    }

    solveCurrent() {
        if (!this.solver) return;

        // Solve the puzzle
        const solution = this.solver.solve();

        // Update the display
        const cells = this.gridContainer.getElementsByTagName('button');
        let index = 0;

        for (let r = 0; r < solution.length; r++) {
            for (let c = 0; c < solution[r].length; c++) {
                const cell = cells[index++];
                if (cell.classList.contains('initial-value')) continue;

                const value = solution[r][c];
                this.setCellValue(cell, value);
            }
        }
    }

    clearGrid() {
        this.resetTimer();
        // Reset solver's grid and counts
        this.solver = new TangoSolver(this.currentPuzzle.size, this.currentPuzzle.constraints);

        // Set only initial values
        this.currentPuzzle.initial.forEach(({ pos: [r, c], value }) => {
            this.solver.setCell(r, c, value);
        });

        this.renderGrid();
        this.checkErrors();
    }

    startTimer() {
        if (this.timerStarted) return;

        this.timerStarted = true;
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    resetTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timerStarted = false;
        this.startTime = null;
        this.timer.textContent = '00:00';
    }

    checkErrors() {
        if (!this.solver) return;

        const showErrors = this.showErrors.checked;
        const cells = Array.from(this.gridContainer.getElementsByTagName('button'));

        // Clear all error states first
        cells.forEach(cell => {
            cell.parentElement.classList.remove('error-cell');
        });

        if (!showErrors) return;

        // Check for errors
        for (let r = 0; r < this.solver.size; r++) {
            for (let c = 0; c < this.solver.size; c++) {
                const index = r * this.solver.size + c;

                // Check for three in a row horizontally
                if (c < this.solver.size - 2) {
                    const val1 = this.solver.grid[r][c];
                    const val2 = this.solver.grid[r][c + 1];
                    const val3 = this.solver.grid[r][c + 2];
                    if (val1 && val1 === val2 && val1 === val3) {
                        cells[index].parentElement.classList.add('error-cell');
                        cells[index + 1].parentElement.classList.add('error-cell');
                        cells[index + 2].parentElement.classList.add('error-cell');
                    }
                }

                // Check for three in a row vertically
                if (r < this.solver.size - 2) {
                    const val1 = this.solver.grid[r][c];
                    const val2 = this.solver.grid[r + 1][c];
                    const val3 = this.solver.grid[r + 2][c];
                    if (val1 && val1 === val2 && val1 === val3) {
                        cells[index].parentElement.classList.add('error-cell');
                        cells[index + this.solver.size].parentElement.classList.add('error-cell');
                        cells[index + this.solver.size * 2].parentElement.classList.add('error-cell');
                    }
                }

                // Check row balance
                const rowCount = this.solver.rowCounts[r];
                if (rowCount.S > this.solver.size / 2 || rowCount.M > this.solver.size / 2) {
                    for (let i = 0; i < this.solver.size; i++) {
                        cells[r * this.solver.size + i].parentElement.classList.add('error-cell');
                    }
                }

                // Check column balance
                const colCount = this.solver.colCounts[c];
                if (colCount.S > this.solver.size / 2 || colCount.M > this.solver.size / 2) {
                    for (let i = 0; i < this.solver.size; i++) {
                        cells[i * this.solver.size + c].parentElement.classList.add('error-cell');
                    }
                }
            }
        }

        // Check constraints
        this.currentPuzzle.constraints.forEach(constraint => {
            const [[r1, c1], [r2, c2]] = constraint.cells;
            const val1 = this.solver.grid[r1][c1];
            const val2 = this.solver.grid[r2][c2];

            if (val1 && val2) {
                let isError = false;
                if (constraint.type === '=' && val1 !== val2) isError = true;
                if (constraint.type === '×' && val1 === val2) isError = true;

                if (isError) {
                    cells[r1 * this.solver.size + c1].parentElement.classList.add('error-cell');
                    cells[r2 * this.solver.size + c2].parentElement.classList.add('error-cell');
                }
            }
        });
    }
}

// Only initialize in browser environment
if (typeof window !== 'undefined' && typeof process === 'undefined') {
    const renderer = new PuzzleRenderer();
    renderer.initialize();

    // Add event listeners
    document.getElementById('solveBtn').addEventListener('click', () => {
        renderer.solveCurrent();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        renderer.clearGrid();
    });
}

export { PuzzleRenderer }; 