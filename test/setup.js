// Add any global test setup here
global.fetch = jest.fn();

// Mock document.head.appendChild for style injection
document.head.appendChild = jest.fn();

// Add these if needed for full DOM support
global.document = window.document;
global.window = window; 