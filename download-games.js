const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');

async function downloadGames() {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: false, // Run in non-headless mode for debugging
        defaultViewport: null // Let the browser window be full size
    });

    const games = [];
    const gamesDir = path.join('www', 'games');
    try {
        await fs.mkdir(gamesDir, { recursive: true });
    } catch (error) {
        console.error('Error creating directory:', error);
    }

    for (let id = 2; id <= 100; id++) {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                console.log(`Downloading puzzle ${id} (attempt ${attempts + 1}/${maxAttempts})...`);

                // Create a new tab for each puzzle
                const page = await browser.newPage();
                console.log(`Created new tab for puzzle ${id}`);

                console.log(`Navigating to https://www.tangogame.org/?id=${id}`);
                await page.goto(`https://www.tangogame.org/?id=${id}`, {
                    timeout: 3000
                });

                // Simple wait before proceeding
                console.log(`Waiting 2 seconds for initial load of puzzle ${id}...`);
                await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

                // Wait for grid and its contents to be visible
                console.log(`Waiting for grid elements to be visible for puzzle ${id}...`);
                await page.waitForSelector('.grid', { visible: true, timeout: 10000 });
                await page.waitForSelector('.grid > div', { visible: true, timeout: 10000 });

                // Additional wait for constraint markers
                await Promise.race([
                    page.waitForSelector('.z-20.text-lg', { visible: true, timeout: 5000 }),
                    new Promise(resolve => setTimeout(resolve, 5000)) // Proceed after 5s even if no markers
                ]);

                console.log(`Waiting for 1 second for puzzle ${id} to stabilize...`);
                await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

                // Save the raw HTML
                console.log(`Extracting HTML for puzzle ${id}...`);
                const html = await page.evaluate(() => {
                    const grid = document.querySelector('.grid');
                    return grid ? grid.outerHTML : null;
                });

                if (!html) {
                    throw new Error('Grid element not found');
                }

                // Extract puzzle data using XPath
                const puzzleData = await page.evaluate((puzzleId) => {
                    const size = 6;

                    // Helper function to get cell position from element
                    const getCellPosition = (element) => {
                        const cells = Array.from(document.querySelectorAll('.grid > div'));
                        const index = cells.indexOf(element);
                        return [Math.floor(index / size), index % size];
                    };

                    // Extract initial values
                    const initial = [];

                    // Find all sun cells
                    document.querySelectorAll('.bg-yellow-400').forEach(sun => {
                        const cell = sun.closest('.grid > div');
                        if (cell) {
                            const [r, c] = getCellPosition(cell);
                            initial.push({ pos: [r, c], value: 'S' });
                        }
                    });

                    // Find all moon cells
                    document.querySelectorAll('img[src*="moon"]').forEach(moon => {
                        const cell = moon.closest('.grid > div');
                        if (cell) {
                            const [r, c] = getCellPosition(cell);
                            initial.push({ pos: [r, c], value: 'M' });
                        }
                    });

                    // Extract constraints
                    const constraints = [];

                    // Find all constraint markers
                    document.querySelectorAll('.z-20.text-lg').forEach(marker => {
                        const type = marker.textContent.trim();
                        const cell = marker.closest('.grid > div');
                        if (!cell) return;

                        const [r, c] = getCellPosition(cell);
                        let connectedCell;

                        // Check marker position to determine connected cell
                        if (marker.classList.contains('translate-x-1/2')) {
                            // Right marker, connect with next cell
                            connectedCell = [r, c + 1];
                        } else if (marker.classList.contains('translate-y-1/2')) {
                            // Bottom marker, connect with cell below
                            connectedCell = [r + 1, c];
                        }

                        if (connectedCell) {
                            constraints.push({
                                type,
                                cells: [[r, c], connectedCell]
                            });
                        }
                    });

                    return {
                        number: puzzleId,
                        size,
                        constraints,
                        initial
                    };
                }, id);

                if (puzzleData) {
                    games.push(puzzleData);
                    // Save individual puzzle file
                    const htmlFilename = path.join(gamesDir, `${id.toString().padStart(3, '0')}.html`);
                    await fs.writeFile(htmlFilename, html, 'utf-8');
                    const jsonFilename = path.join(gamesDir, `${id.toString().padStart(3, '0')}.json`);
                    await fs.writeFile(
                        jsonFilename,
                        JSON.stringify(puzzleData, null, 2),
                        'utf-8'
                    );
                    console.log(`Successfully downloaded puzzle ${id}`);
                }

                // Close the tab when done
                await page.close();
                console.log(`Closed tab for puzzle ${id}`);

                break; // Success - exit retry loop

            } catch (error) {
                attempts++;
                console.error(`Error downloading puzzle ${id} (attempt ${attempts}/${maxAttempts}):`, error);

                if (attempts >= maxAttempts) {
                    console.error(`Failed to download puzzle ${id} after ${maxAttempts} attempts`);
                } else {
                    console.log(`Retrying puzzle ${id} in 5 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }
    }

    await browser.close();
    console.log('Browser closed');

    // Save index file with all games
    await fs.writeFile(
        path.join(gamesDir, 'index.json'),
        JSON.stringify(games, null, 2),
        'utf-8'
    );

    console.log(`Downloaded ${games.length} puzzles successfully!`);
}

// Run the download
downloadGames().catch(console.error);
