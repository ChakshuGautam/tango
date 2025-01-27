class TangoSolver {
    constructor(size, constraints) {
        this.size = size;
        this.grid = Array(size).fill().map(() => Array(size).fill(null));
        this.constraints = constraints;
        this.rowCounts = Array(size).fill().map(() => ({ S: 0, M: 0 }));
        this.colCounts = Array(size).fill().map(() => ({ S: 0, M: 0 }));
        this.debug = false;
    }

    log(...args) {
        if (this.debug) console.log(...args);
    }

    setCell(r, c, value) {
        if (this.grid[r][c] !== null) return false;

        // Check if this move would create three in a row
        if (this.wouldCreateThreeInARow(r, c, value)) {
            return false;
        }

        // Check if this move would make row/column unbalanced
        if (this.wouldMakeUnbalanced(r, c, value)) {
            return false;
        }

        this.grid[r][c] = value;
        this.rowCounts[r][value]++;
        this.colCounts[c][value]++;
        this.log(`Set [${r},${c}] to ${value}`);
        return true;
    }

    wouldCreateThreeInARow(r, c, value) {
        // Check horizontal
        if (c >= 2 && this.grid[r][c - 1] === value && this.grid[r][c - 2] === value) return true;
        if (c <= this.size - 3 && this.grid[r][c + 1] === value && this.grid[r][c + 2] === value) return true;
        if (c > 0 && c < this.size - 1 && this.grid[r][c - 1] === value && this.grid[r][c + 1] === value) return true;

        // Check vertical
        if (r >= 2 && this.grid[r - 1][c] === value && this.grid[r - 2][c] === value) return true;
        if (r <= this.size - 3 && this.grid[r + 1][c] === value && this.grid[r + 2][c] === value) return true;
        if (r > 0 && r < this.size - 1 && this.grid[r - 1][c] === value && this.grid[r + 1][c] === value) return true;

        return false;
    }

    wouldMakeUnbalanced(r, c, value) {
        const target = this.size / 2;
        // Check if adding this value would exceed the maximum allowed in row or column
        if (this.rowCounts[r][value] >= target) return true;
        if (this.colCounts[c][value] >= target) return true;
        return false;
    }

    solve() {
        let changed;
        let iterations = 0;
        const maxIterations = 100;

        // First apply all initial values and their immediate implications
        this.applyInitialValues();

        do {
            changed = false;
            this.log(`\nIteration ${iterations + 1}:`);

            // Order matters - like solving a Sudoku
            changed |= this.processEqualityConstraints();  // Process = constraints first
            changed |= this.processOppositeConstraints();  // Then × constraints
            changed |= this.processForcedByPairs();       // Look for pairs forcing moves
            changed |= this.preventThreeInARow();         // Prevent three in a row
            changed |= this.fillForcedByBalance();        // Use row/column counting
            changed |= this.checkSinglePossibility();     // If only one value possible, use it

            if (changed) {
                this.log("Current grid state:");
                this.logGrid();
            }

            iterations++;
            if (iterations > maxIterations) {
                console.log("Max iterations reached");
                break;
            }
        } while (changed);

        return this.grid;
    }

    applyInitialValues() {
        // Process initial values and their immediate implications
        let changed;
        do {
            changed = false;
            changed |= this.processEqualityConstraints();
            changed |= this.processOppositeConstraints();
            changed |= this.processForcedByPairs();
        } while (changed);
    }

    processEqualityConstraints() {
        let changed = false;
        this.constraints.forEach(({ type, cells }) => {
            if (type !== '=') return;

            const [[r1, c1], [r2, c2]] = cells;
            const val1 = this.grid[r1][c1];
            const val2 = this.grid[r2][c2];

            if (val1 !== null && val2 === null) {
                changed |= this.setCell(r2, c2, val1);
            } else if (val2 !== null && val1 === null) {
                changed |= this.setCell(r1, c1, val2);
            }
        });
        return changed;
    }

    processOppositeConstraints() {
        let changed = false;
        this.constraints.forEach(({ type, cells }) => {
            if (type !== '×') return;

            const [[r1, c1], [r2, c2]] = cells;
            const val1 = this.grid[r1][c1];
            const val2 = this.grid[r2][c2];

            if (val1 !== null && val2 === null) {
                changed |= this.setCell(r2, c2, val1 === 'S' ? 'M' : 'S');
            } else if (val2 !== null && val1 === null) {
                changed |= this.setCell(r1, c1, val2 === 'S' ? 'M' : 'S');
            }
        });
        return changed;
    }

    checkSinglePossibility() {
        let changed = false;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] !== null) continue;

                // Check if only one value is possible
                const canBeS = !this.wouldCreateThreeInARow(r, c, 'S') &&
                    !this.wouldMakeUnbalanced(r, c, 'S');
                const canBeM = !this.wouldCreateThreeInARow(r, c, 'M') &&
                    !this.wouldMakeUnbalanced(r, c, 'M');

                if (canBeS && !canBeM) {
                    changed |= this.setCell(r, c, 'S');
                } else if (!canBeS && canBeM) {
                    changed |= this.setCell(r, c, 'M');
                }
            }
        }
        return changed;
    }

    preventThreeInARow() {
        let changed = false;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] !== null) continue;

                // Check if this cell must be S or M to prevent three in a row
                if (this.wouldCreateThreeInARow(r, c, 'S') && this.setCell(r, c, 'M')) {
                    changed = true;
                } else if (this.wouldCreateThreeInARow(r, c, 'M') && this.setCell(r, c, 'S')) {
                    changed = true;
                }
            }
        }
        return changed;
    }

    fillForcedByBalance() {
        let changed = false;
        const target = this.size / 2;

        // Check rows
        for (let r = 0; r < this.size; r++) {
            if (this.rowCounts[r].S === target) {
                for (let c = 0; c < this.size; c++) {
                    if (this.grid[r][c] === null && this.setCell(r, c, 'M')) changed = true;
                }
            }
            if (this.rowCounts[r].M === target) {
                for (let c = 0; c < this.size; c++) {
                    if (this.grid[r][c] === null && this.setCell(r, c, 'S')) changed = true;
                }
            }
        }

        // Check columns
        for (let c = 0; c < this.size; c++) {
            if (this.colCounts[c].S === target) {
                for (let r = 0; r < this.size; r++) {
                    if (this.grid[r][c] === null && this.setCell(r, c, 'M')) changed = true;
                }
            }
            if (this.colCounts[c].M === target) {
                for (let r = 0; r < this.size; r++) {
                    if (this.grid[r][c] === null && this.setCell(r, c, 'S')) changed = true;
                }
            }
        }
        return changed;
    }

    processForcedByPairs() {
        let changed = false;
        // Check horizontal pairs
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size - 1; c++) {
                if (this.grid[r][c] === this.grid[r][c + 1] && this.grid[r][c] !== null) {
                    if (c > 0 && this.grid[r][c - 1] === null) {
                        if (this.setCell(r, c - 1, this.grid[r][c] === 'S' ? 'M' : 'S')) changed = true;
                    }
                    if (c < this.size - 2 && this.grid[r][c + 2] === null) {
                        if (this.setCell(r, c + 2, this.grid[r][c] === 'S' ? 'M' : 'S')) changed = true;
                    }
                }
            }
        }

        // Check vertical pairs
        for (let c = 0; c < this.size; c++) {
            for (let r = 0; r < this.size - 1; r++) {
                if (this.grid[r][c] === this.grid[r + 1][c] && this.grid[r][c] !== null) {
                    if (r > 0 && this.grid[r - 1][c] === null) {
                        if (this.setCell(r - 1, c, this.grid[r][c] === 'S' ? 'M' : 'S')) changed = true;
                    }
                    if (r < this.size - 2 && this.grid[r + 2][c] === null) {
                        if (this.setCell(r + 2, c, this.grid[r][c] === 'S' ? 'M' : 'S')) changed = true;
                    }
                }
            }
        }
        return changed;
    }

    logGrid() {
        if (!this.debug) return;
        console.log(this.grid.map(row =>
            row.map(cell => cell === null ? '_' : cell).join(' ')
        ).join('\n'));
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TangoSolver };
} else {
    window.TangoSolver = TangoSolver;
} 