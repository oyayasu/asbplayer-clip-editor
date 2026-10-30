/**
 * Content script for asbplayer AI automation.
 * Injected into ChatGPT, Claude, and Gemini tabs to locate input elements,
 * inject prompt text safely across various DOM structures, and optionally submit.
 */

(function () {
    if (window.__asbplayerAIAutomationInjected) {
        return;
    }
    window.__asbplayerAIAutomationInjected = true;

    // Selector definitions for supported AI platforms
    const DOM_SELECTORS = {
        chatgpt: {
            input: [
                '#prompt-textarea',
                'textarea[data-id="root"]',
                'div[contenteditable="true"]#prompt-textarea',
                'fieldset textarea',
                'form textarea',
                'textarea',
                'div[contenteditable="true"]',
            ],
            submit: [
                'button[data-testid="send-button"]',
                'button[aria-label*="Send"]',
                'button[aria-label*="send"]',
                'form button[type="submit"]',
                'button.bg-primary-500',
            ],
        },
        claude: {
            input: [
                'div[contenteditable="true"][aria-label*="Claude"]',
                'div[contenteditable="true"][data-placeholder]',
                'div[contenteditable="true"]',
                'fieldset div[contenteditable="true"]',
                'textarea',
            ],
            submit: [
                'button[aria-label*="Send"]',
                'button[aria-label*="send"]',
                'button[aria-label*="Submit"]',
                'fieldset button:not([disabled])',
                'button.bg-accent-main-100',
            ],
        },
        gemini: {
            input: [
                'rich-textarea div[contenteditable="true"]',
                '.ql-editor[contenteditable="true"]',
                'textarea[aria-label*="prompt"]',
                'textarea[aria-label*="Prompt"]',
                'div[contenteditable="true"]',
                'textarea',
            ],
            submit: [
                'button[aria-label*="Send"]',
                'button[aria-label*="send"]',
                'button.send-button',
                'button[aria-label*="Submit"]',
            ],
        },
        generic: {
            input: [
                'textarea[placeholder*="Ask"]',
                'textarea[placeholder*="Message"]',
                'textarea',
                'div[contenteditable="true"]',
            ],
            submit: [
                'button[type="submit"]',
                'button[aria-label*="Send"]',
                'button[aria-label*="send"]',
            ],
        },
    };

    /**
     * Identifies the current AI provider based on hostname.
     */
    function detectProvider() {
        const host = window.location.hostname;
        if (host.includes('chatgpt.com') || host.includes('openai.com')) {
            return 'chatgpt';
        }
        if (host.includes('claude.ai')) {
            return 'claude';
        }
        if (host.includes('gemini.google.com')) {
            return 'gemini';
        }
        return 'generic';
    }

    /**
     * Polls the DOM until a matching element is found or timeout is reached.
     */
    async function waitForElement(selectors, timeoutMs = 8000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            for (const selector of selectors) {
                try {
                    const el = document.querySelector(selector);
                    if (el && isElementVisible(el)) {
                        return el;
                    }
                } catch {
                    // Ignore invalid selector errors
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return null;
    }

    /**
     * Helper to check element visibility and non-disabled status.
     */
    function isElementVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
    }

    /**
     * Safely inserts text into a standard textarea / input element, triggering React/Vue listeners.
     */
    function setNativeInputValue(element, value) {
        element.focus();
        const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set ||
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

        if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            element.value = value;
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * Safely inserts text into a contenteditable element (ProseMirror, Quill, Draft.js, etc).
     */
    function setContentEditableValue(element, text) {
        element.focus();

        // Select all existing content
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        // Try execCommand insertText first (works best with rich text editors / React state)
        let success = false;
        try {
            success = document.execCommand('insertText', false, text);
        } catch {
            success = false;
        }

        if (!success) {
            // Fallback to text content manipulation + Range insertion
            element.textContent = text;
            const newRange = document.createRange();
            newRange.selectNodeContents(element);
            newRange.collapse(false);
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }

        // Dispatch synthetic events
        try {
            element.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
            element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } catch {
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /**
     * Injects prompt text into the current AI tab.
     */
    async function injectPrompt(prompt, autoSubmit) {
        const provider = detectProvider();
        const config = DOM_SELECTORS[provider] || DOM_SELECTORS.generic;

        const inputEl = await waitForElement(config.input);
        if (!inputEl) {
            return {
                success: false,
                error: `Could not locate input field for provider '${provider}'`,
            };
        }

        // Inject text into detected input
        if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
            setNativeInputValue(inputEl, prompt);
        } else if (inputEl.isContentEditable || inputEl.getAttribute('contenteditable') === 'true') {
            setContentEditableValue(inputEl, prompt);
        } else {
            setNativeInputValue(inputEl, prompt);
        }

        if (!autoSubmit) {
            return { success: true, provider, submitted: false };
        }

        // Wait brief delay before attempting submit
        await new Promise((resolve) => setTimeout(resolve, 300));

        let submitButton = null;
        for (const selector of config.submit) {
            const btn = document.querySelector(selector);
            if (btn && isElementVisible(btn) && !btn.hasAttribute('disabled')) {
                submitButton = btn;
                break;
            }
        }

        if (submitButton) {
            try {
                submitButton.click();
                return { success: true, provider, submitted: true };
            } catch (err) {
                // Fallthrough to enter key if click fails
            }
        }

        // Fallback: Dispatch Enter key event on input element
        try {
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true,
            });
            inputEl.dispatchEvent(enterEvent);
            return { success: true, provider, submitted: true, method: 'enter_key' };
        } catch (err) {
            return { success: true, provider, submitted: false, warning: 'Prompt inserted but could not trigger submit button' };
        }
    }

    // Register extension runtime listener
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message?.action === 'ASBPLAYER_AI_PING') {
                sendResponse({ status: 'ok', provider: detectProvider() });
                return false;
            }

            if (message?.action === 'ASBPLAYER_INJECT_PROMPT') {
                injectPrompt(message.prompt, message.autoSubmit ?? true)
                    .then((res) => sendResponse(res))
                    .catch((err) => {
                        sendResponse({
                            success: false,
                            error: err instanceof Error ? err.message : String(err),
                        });
                    });
                return true; // Keep channel open for async response
            }

            return false;
        });
    }
})();
