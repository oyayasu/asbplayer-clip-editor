/**
 * Routes dictionary requests through the installed extension's background process.
 * Streaming Anki UI is hosted in an iframe and cannot reliably fetch arbitrary
 * third-party APIs because of CORS/CSP restrictions.
 *
 * The background accepts only two fixed providers and validates all input.
 */
export type Service = 'dictionary' | 'translation';
export type FluencyBridgeLookup = (service: Service, term: string) => Promise<unknown>;
type ChromeRuntime = {
    id?: string;
    lastError?: {message?: string};
    sendMessage: (message: unknown, response: (data: unknown) => void) => void;
};

const runtimeForUi = (): ChromeRuntime | undefined => {
    if (typeof window === 'undefined') return undefined;
    const globals = window as unknown as {
        chrome?: {runtime?: ChromeRuntime};
        browser?: {runtime?: ChromeRuntime};
    };
    return globals.chrome?.runtime?.id ? globals.chrome.runtime :
        globals.browser?.runtime?.id ? globals.browser.runtime : undefined;
};

export async function fluencyGetJson(service: Service, term: string, signal: AbortSignal, viaBridge?: FluencyBridgeLookup): Promise<unknown> {
    if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
    // Netflix and other video sites host the Anki editor in an about:blank iframe.
    // Such frames may inherit the page origin and have no extension runtime.
    // Prefer the existing asbplayer message bridge when it is supplied.
    if (viaBridge) {
        const result = await viaBridge(service, term);
        if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
        return result;
    }
    const runtime = runtimeForUi();
    if (!runtime) {
        // Unmodified web app / standalone player fallback.
        const url = service === 'dictionary'
            ? 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(term)
            : 'https://api.mymemory.translated.net/get?' +
              new URLSearchParams({q:term,langpair:'en|pt-BR'});
        const response = await fetch(url, {signal});
        if (response.status === 404) return [];
        if (!response.ok) throw Error(service + ': HTTP ' + response.status);
        return response.json();
    }

    return new Promise<unknown>((resolve,reject) => {
        let settled=false;
        const rejectIfPending = (e: Error) => {
            if (settled) return;
            settled=true;
            clearTimeout(timer);
            signal.removeEventListener('abort',aborted);
            reject(e);
        };
        const aborted=()=>rejectIfPending(new DOMException('Canceled','AbortError'));
        const timer=setTimeout(()=>rejectIfPending(Error('Tempo esgotado ao consultar '+service)),12000);
        signal.addEventListener('abort',aborted,{once:true});
        try {
            runtime.sendMessage({command:'asbplayer-fluency-lookup',service,term},(result: unknown) => {
                if (settled) return;
                const error=runtime.lastError?.message;
                if (error) { rejectIfPending(Error(error));return; }
                const response = result as {data?:unknown,error?:string}|undefined;
                if (!response || response.error) {
                    rejectIfPending(Error(response?.error || 'Nenhuma resposta do serviço de dicionário'));
                    return;
                }
                settled=true;
                clearTimeout(timer);
                signal.removeEventListener('abort',aborted);
                resolve(response.data);
            });
        } catch(e) {
            rejectIfPending(e instanceof Error ? e : Error(String(e)));
        }
    });
}
