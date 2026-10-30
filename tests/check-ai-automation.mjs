import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 1. Verify file content and structure
const bgCode = readFileSync('background.ts', 'utf8');
const csCode = readFileSync('content-scripts/ai-automation.js', 'utf8');
const manifestCode = readFileSync('manifest-permissions.ts', 'utf8');

assert(bgCode.includes('export async function handleAIAutomation'));
assert(bgCode.includes('chrome.scripting.executeScript'));
assert(bgCode.includes('chrome.tabs.query'));
assert(bgCode.includes('Extension context invalidated'));
assert(bgCode.includes('chatgpt.com'));
assert(bgCode.includes('claude.ai'));
assert(bgCode.includes('gemini.google.com'));

assert(csCode.includes('#prompt-textarea'));
assert(csCode.includes('div[contenteditable="true"]'));
assert(csCode.includes('ASBPLAYER_INJECT_PROMPT'));
assert(csCode.includes('detectProvider'));
assert(csCode.includes('setNativeInputValue'));
assert(csCode.includes('setContentEditableValue'));

assert(manifestCode.includes("'scripting'"));
assert(manifestCode.includes("'tabs'"));
assert(manifestCode.includes("'activeTab'"));
assert(manifestCode.includes('https://chatgpt.com/*'));
assert(manifestCode.includes('https://claude.ai/*'));
assert(manifestCode.includes('https://gemini.google.com/*'));

console.log('✓ Source file content checks passed');

// 2. Mock Chrome APIs for background testing
const mockTabs = [];
let scriptExecuted = false;

globalThis.chrome = {
    runtime: {
        id: 'test-extension-id',
        lastError: undefined,
        onMessage: {
            addListener: (cb) => {
                globalThis._bgMessageListener = cb;
            },
        },
    },
    tabs: {
        query: async (queryObj) => mockTabs,
        get: async (tabId) => mockTabs.find((t) => t.id === tabId) || { id: tabId, status: 'complete' },
        update: async (tabId, updateProps) => {
            const tab = mockTabs.find((t) => t.id === tabId);
            if (tab) Object.assign(tab, updateProps);
            return tab;
        },
        create: async (createProps) => {
            const newTab = { id: 101, status: 'complete', url: createProps.url, active: true };
            mockTabs.push(newTab);
            return newTab;
        },
        sendMessage: async (tabId, msg) => {
            if (msg.action === 'ASBPLAYER_AI_PING') {
                return { status: 'ok', provider: 'chatgpt' };
            }
            if (msg.action === 'ASBPLAYER_INJECT_PROMPT') {
                return { success: true, provider: 'chatgpt', submitted: true };
            }
            return { success: false };
        },
    },
    windows: {
        update: async (winId, props) => ({ id: winId, ...props }),
    },
    scripting: {
        executeScript: async (params) => {
            scriptExecuted = true;
            return [{ result: true }];
        },
    },
};

// Import compiled or raw module functions from background.ts
const { handleAIAutomation, matchesProviderUrl, resolveProvider, safeChromeCall } = await import('../background.ts');

// Test helper functions
assert.equal(resolveProvider('chatgpt'), 'chatgpt');
assert.equal(resolveProvider('claude'), 'claude');
assert.equal(resolveProvider('gemini'), 'gemini');
assert.equal(resolveProvider('unknown_provider'), 'chatgpt');

assert.equal(matchesProviderUrl('https://chatgpt.com/c/12345', 'chatgpt'), true);
assert.equal(matchesProviderUrl('https://claude.ai/chat/abc', 'claude'), true);
assert.equal(matchesProviderUrl('https://gemini.google.com/app/xyz', 'gemini'), true);
assert.equal(matchesProviderUrl('https://google.com', 'chatgpt'), false);

console.log('✓ Helper logic unit tests passed');

// Test extension context invalidation safe wrapper
delete globalThis.chrome.runtime.id;
const invalidContextRes = await safeChromeCall(async () => 'ok');
assert.equal(invalidContextRes.error, 'Extension context invalidated');

// Restore chrome runtime id
globalThis.chrome.runtime.id = 'test-extension-id';

// Test tab discovery & automation execution
mockTabs.push({ id: 1, url: 'https://chatgpt.com/c/test', active: true, windowId: 1 });

const bgRes = await handleAIAutomation({
    action: 'ASBPLAYER_SEND_TO_AI',
    provider: 'chatgpt',
    prompt: 'Translate this subtitle: Hello world',
    autoSubmit: true,
});

assert.equal(bgRes.success, true);
assert.equal(bgRes.provider, 'chatgpt');
assert.equal(bgRes.tabId, 1);

console.log('✓ Background automation orchestration tests passed');

// 3. Lightweight DOM mocking for content-scripts/ai-automation.js
class MockElement {
    constructor(tagName, id = '', attrs = {}) {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.attrs = attrs;
        this.value = '';
        this.textContent = '';
        this.offsetWidth = 100;
        this.offsetHeight = 30;
        this.listeners = {};
    }

    getAttribute(name) {
        return this.attrs[name] || null;
    }

    hasAttribute(name) {
        return name in this.attrs;
    }

    focus() {}

    addEventListener(type, fn) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(fn);
    }

    dispatchEvent(evt) {
        const fns = this.listeners[evt.type] || [];
        for (const fn of fns) fn(evt);
        return true;
    }

    click() {
        this.dispatchEvent({ type: 'click' });
    }

    getClientRects() {
        return [{ width: 100, height: 30 }];
    }
}

class MockHTMLTextAreaElement extends MockElement {
    constructor(id, attrs) {
        super('TEXTAREA', id, attrs);
    }
}

const mockTextarea = new MockHTMLTextAreaElement('prompt-textarea', {});
const mockSendButton = new MockElement('BUTTON', '', { 'data-testid': 'send-button' });

let submitted = false;
mockSendButton.addEventListener('click', () => {
    submitted = true;
});

globalThis.window = {
    location: { hostname: 'chatgpt.com' },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
    getSelection: () => ({
        removeAllRanges: () => {},
        addRange: () => {},
    }),
    HTMLTextAreaElement: MockHTMLTextAreaElement,
    HTMLInputElement: class {},
};

globalThis.document = {
    querySelector: (selector) => {
        if (selector.includes('#prompt-textarea') || selector.includes('textarea')) {
            return mockTextarea;
        }
        if (selector.includes('send-button')) {
            return mockSendButton;
        }
        return null;
    },
    createRange: () => ({
        selectNodeContents: () => {},
        collapse: () => {},
    }),
    execCommand: (cmd, show, text) => {
        if (cmd === 'insertText') {
            mockTextarea.value = text;
            return true;
        }
        return false;
    },
};

globalThis.Event = class Event {
    constructor(type) {
        this.type = type;
    }
};

globalThis.InputEvent = class InputEvent extends Event {};
globalThis.KeyboardEvent = class KeyboardEvent extends Event {};

// Execute content script in current global scope
let injectedListener = null;
globalThis.chrome.runtime.onMessage.addListener = (cb) => {
    injectedListener = cb;
};

new Function(csCode)();

assert.notEqual(injectedListener, null);

// Test ping response
let pingResponse = null;
injectedListener({ action: 'ASBPLAYER_AI_PING' }, {}, (res) => {
    pingResponse = res;
});

assert.deepEqual(pingResponse, { status: 'ok', provider: 'chatgpt' });

// Test prompt injection
let injectResponse = null;
injectedListener({ action: 'ASBPLAYER_INJECT_PROMPT', prompt: 'Test prompt for ChatGPT', autoSubmit: true }, {}, (res) => {
    injectResponse = res;
});

// Wait briefly for async prompt injection
await new Promise((resolve) => setTimeout(resolve, 500));

assert.equal(mockTextarea.value, 'Test prompt for ChatGPT');
assert.equal(submitted, true);

console.log('✓ Content script DOM injection & auto-submit tests passed');
console.log('ALL AI AUTOMATION TESTS PASSED SUCCESSFULLY.');
