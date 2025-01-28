module.exports = {
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/test/styleMock.js',
        '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/test/fileMock.js',
    },
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
    collectCoverage: true,
    collectCoverageFrom: [
        'www/**/*.js',
        '!www/bundle.js',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
}; 