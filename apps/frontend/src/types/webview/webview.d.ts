interface Window {
    chrome?: {
        webview?: {
            postMessage(message: string): void;
            addEventListener(type: "message", handler: (event: MessageEvent<string>) => void): void;
            removeEventListener(type: "message", handler: (event: MessageEvent<string>) => void): void;
        };
    };
}
