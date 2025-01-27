import { TangoSolver } from './game';
import './styles.css';

class PuzzleRenderer {
    constructor() {
        this.gridContainer = document.getElementById('gridContainer');
        this.puzzleSelect = document.getElementById('puzzleSelect');
        this.currentPuzzle = null;
        this.solver = null;

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

                // Add initial values
                const value = this.solver.grid[r][c];
                if (value) {
                    button.innerHTML = value === 'S'
                        ? '<div class="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-500"></div>'
                        : '<img width="30" src="moon.png">';
                    button.classList.add('initial-value');
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
                if (value) {
                    cell.innerHTML = value === 'S'
                        ? '<div class="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-500"></div>'
                        : '<img width="30" src="moon.png">';
                }
            }
        }
    }

    clearGrid() {
        // Reload the current puzzle to reset it
        this.loadPuzzle(this.currentPuzzle.number);
    }
}


// Initialize the application
const renderer = new PuzzleRenderer();

// Add event listeners
document.getElementById('solveBtn').addEventListener('click', () => {
    renderer.solveCurrent();
});

document.getElementById('clearBtn').addEventListener('click', () => {
    renderer.clearGrid();
}); 