#include "globals.h"

// Window & instance
HINSTANCE g_hInst     = nullptr;
HWND      g_hWnd      = nullptr;
HANDLE    g_jobHandle = NULL;

// Child Processes
PROCESS_INFORMATION g_dataApiProcInfo         = { 0 };
PROCESS_INFORMATION g_streamingServerProcInfo = { 0 };

// mpv
mpv_handle *g_mpv = nullptr;
std::thread g_mpvThread;
bool        g_isMpvPlaying = false;

// WebView2
wil::com_ptr<ICoreWebView2Controller> g_webviewController;
wil::com_ptr<ICoreWebView2>           g_webview;

// Command handler
WebViewProtocol::CommandHandler g_commandHandler;