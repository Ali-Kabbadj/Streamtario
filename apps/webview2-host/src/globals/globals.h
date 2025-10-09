#ifndef GLOBALS_H
#define GLOBALS_H

#include <string>
#include <thread>
#include <vector>
#include <wil/com.h>
#include <windows.h>
#include "mpv/client.h"
#include <WebView2.h>
#include <webview_protocol/command_handler/command_handler.h>

extern bool g_isMpvPlaying;

// App info
const WCHAR g_szWindowClass[] = L"WebViewMPVWindowClass";
const WCHAR g_szTitle[] = L"Streamtario";


// Globals
extern HINSTANCE g_hInst;
extern HWND g_hWnd;
extern HANDLE g_jobHandle;

// Child Processes
extern PROCESS_INFORMATION g_dataApiProcInfo;
extern PROCESS_INFORMATION g_streamingServerProcInfo;

// mpv
extern mpv_handle *g_mpv;
extern std::thread g_mpvThread;

// WebView2
extern wil::com_ptr<ICoreWebView2Controller> g_webviewController;
extern wil::com_ptr<ICoreWebView2> g_webview;
// Custom Messages
#define WM_MPV_WAKEUP (WM_APP + 2)

// Command Hander
extern WebViewProtocol::CommandHandler g_commandHandler;

#endif