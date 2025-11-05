#include "globals.h"

HINSTANCE g_hInst = nullptr;
HWND g_hWnd = nullptr;
HANDLE g_jobHandle = NULL;

PROCESS_INFORMATION g_dataApiProcInfo = {0};
PROCESS_INFORMATION g_streamingServerProcInfo = {0};

mpv_handle *g_mpv = nullptr;
std::thread g_mpvThread;
bool g_isMpvPlaying = false;

wil::com_ptr<ICoreWebView2Environment> g_webviewEnv;
wil::com_ptr<ICoreWebView2Controller> g_webviewController;
wil::com_ptr<ICoreWebView2> g_webview;

WebViewProtocol::CommandHandler g_commandHandler;