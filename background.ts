/**
 * Background script for asbplayer cross-tab AI automation.
 * Handles cross-tab communication, tab matching/opening, script injection,
 * and context invalidation protection for ChatGPT, Claude, and Gemini.
 */

export type AIProvider = 'chatgpt' | 'claude' | 'gemini';

export interface AIAutomationRequest {
    action?: string;
    command?: string;
    type?: string;
    provider?: AIProvider | 'auto';
    prompt: string;
    autoSubmit?: boolean;
    targetUrl?: string;
}

export interface AIAutomationResponse {
    success: boolean;
    provider?: AIProvider;
    tabId?: number;
    error?: string;
}

export interface AIProviderConfig {
    id: AIProvider;
    name: string;
    defaultUrl: string;
    urlPatterns: string[];
    matchDomains: string[];
}

export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
    chatgpt: {
        id: 'chatgpt',
        name: 'ChatGPT',
        defaultUrl: 'https://chatgpt.com/',
        urlPatterns: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
        matchDomains: ['chatgpt.com', 'chat.openai.com'],
    },
    claude: {
        id: 'claude',
        name: 'Claude',
        defaultUrl: 'https://claude.ai/new',
        urlPatterns: ['https://claude.ai/*'],
        matchDomains: ['claude.ai'],
    },
    gemini: {
        id: 'gemini',
        name: 'Gemini',
        defaultUrl: 'https://gemini.google.com/app',
        urlPatterns: ['https://gemini.google.com/*'],
        matchDomains: ['gemini.google.com'],
    },
};

/**
 * Safely executes a Chrome extension API call, checking for context invalidation or lastError.
 */
export async function safeChromeCall<T>(fn: () => Promise<T>): Promise<{ result?: T; error?: string }> {
    try {
        if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
            return { error: 'Extension context invalidated' };
        }
        const result = await fn();
        if (chrome.runtime.lastError) {
            return { error: chrome.runtime.lastError.message };
        }
        return { result };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: message };
    }
}

/**
 * Determines if a given URL matches a provider configuration.
 */
export function matchesProviderUrl(url: string | undefined, provider: AIProvider): boolean {
    if (!url) return false;
    const config = AI_PROVIDERS[provider];
    if (!config) return false;
    try {
        const parsed = new URL(url);
        return config.matchDomains.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
    } catch {
        return false;
    }
}

/**
 * Resolves the target AI provider. Defaults to ChatGPT if set to auto or unknown.
 */
export function resolveProvider(requested?: AIProvider | 'auto' | string): AIProvider {
    if (requested && requested in AI_PROVIDERS) {
        return requested as AIProvider;
    }
    return 'chatgpt';
}

/**
 * Finds an existing tab matching the provider, prioritizing active tabs in current window.
 */
export async function findExistingAITab(provider: AIProvider): Promise<chrome.tabs.Tab | null> {
    const { result: tabs, error } = await safeChromeCall(() =>
        chrome.tabs.query({})
    );

    if (error || !tabs) return null;

    const matchingTabs = tabs.filter((tab) => tab.id !== undefined && matchesProviderUrl(tab.url, provider));

    if (matchingTabs.length === 0) return null;

    // Prefer active tab if present, else most recent (last in query array)
    const activeMatch = matchingTabs.find((tab) => tab.active);
    return activeMatch || matchingTabs[matchingTabs.length - 1];
}

/**
 * Waits until a tab completes loading or times out.
 */
export async function waitForTabToLoad(tabId: number, timeoutMs = 15000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        const { result: tab } = await safeChromeCall(() => chrome.tabs.get(tabId));
        if (tab && tab.status === 'complete') {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
}

/**
 * Ensures automation content script is injected into the target tab.
 */
export async function injectAutomationScript(tabId: number): Promise<boolean> {
    // Check if script is already responsive
    const pingResult = await safeChromeCall(() =>
        chrome.tabs.sendMessage(tabId, { action: 'ASBPLAYER_AI_PING' })
    );

    if (pingResult.result && pingResult.result.status === 'ok') {
        return true;
    }

    // Inject content-scripts/ai-automation.js
    const injectionResult = await safeChromeCall(() =>
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content-scripts/ai-automation.js'],
        })
    );

    if (injectionResult.error) {
        console.warn(`[asbplayer] Script injection failed for tab ${tabId}:`, injectionResult.error);
        return false;
    }

    return true;
}

/**
 * Sends prompt payload to the automation script in target tab.
 */
export async function sendPromptToTab(
    tabId: number,
    prompt: string,
    autoSubmit = false
): Promise<{ success: boolean; error?: string }> {
    const response = await safeChromeCall(() =>
        chrome.tabs.sendMessage(tabId, {
            action: 'ASBPLAYER_INJECT_PROMPT',
            prompt,
            autoSubmit,
        })
    );

    if (response.error) {
        return { success: false, error: response.error };
    }

    if (response.result && response.result.success) {
        return { success: true };
    }

    return {
        success: false,
        error: response.result?.error || 'Failed to inject prompt into AI page',
    };
}

/**
 * Main orchestration for cross-tab AI automation request.
 */
export async function handleAIAutomation(request: AIAutomationRequest): Promise<AIAutomationResponse> {
    if (!request.prompt || typeof request.prompt !== 'string' || !request.prompt.trim()) {
        return { success: false, error: 'Prompt string must not be empty' };
    }

    const provider = resolveProvider(request.provider);
    const config = AI_PROVIDERS[provider];

    let tab = await findExistingAITab(provider);
    let tabId: number;

    if (tab && tab.id !== undefined) {
        tabId = tab.id;
        // Focus tab and window
        await safeChromeCall(() => chrome.tabs.update(tabId, { active: true }));
        if (tab.windowId !== undefined) {
            await safeChromeCall(() => chrome.windows.update(tab.windowId, { focused: true }));
        }
    } else {
        // Open new tab
        const targetUrl = request.targetUrl || config.defaultUrl;
        const newTabRes = await safeChromeCall(() => chrome.tabs.create({ url: targetUrl, active: true }));
        if (newTabRes.error || !newTabRes.result || newTabRes.result.id === undefined) {
            return { success: false, provider, error: newTabRes.error || 'Failed to create new AI tab' };
        }
        tabId = newTabRes.result.id;
        const loaded = await waitForTabToLoad(tabId);
        if (!loaded) {
            return { success: false, provider, tabId, error: 'AI tab timed out while loading' };
        }
    }

    // Inject automation script
    const injected = await injectAutomationScript(tabId);
    if (!injected) {
        return { success: false, provider, tabId, error: 'Failed to inject AI automation script into tab' };
    }

    // Send prompt
    const promptRes = await sendPromptToTab(tabId, request.prompt, request.autoSubmit ?? true);
    if (!promptRes.success) {
        return { success: false, provider, tabId, error: promptRes.error };
    }

    return { success: true, provider, tabId };
}

/**
 * Sets up runtime message listeners for cross-tab AI automation.
 */
export function initBackgroundListeners(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) {
        return;
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const action = message?.action || message?.command || message?.type;

        if (action === 'ASBPLAYER_SEND_TO_AI' || action === 'asbplayer-send-to-ai') {
            handleAIAutomation(message)
                .then((res) => sendResponse(res))
                .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
            return true; // Keep message channel open for async response
        }

        return false;
    });
}

// Initialize when imported in background extension context
initBackgroundListeners();
