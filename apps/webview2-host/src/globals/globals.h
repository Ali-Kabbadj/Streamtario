#ifndef GLOBALS_H
#define GLOBALS_H

#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <string>
#include <thread>
#include <vector>
#include <wil/com.h>
#include "mpv/client.h"
#include <WebView2.h>
#include <webview_protocol/command_handler/command_handler.h>

extern bool g_isMpvPlaying;

const WCHAR g_szWindowClass[] = L"WebViewMPVWindowClass";
const WCHAR g_szTitle[] = L"Streamtario";

extern HINSTANCE g_hInst;
extern HWND g_hWnd;
extern HANDLE g_jobHandle;

extern PROCESS_INFORMATION g_dataApiProcInfo;
extern PROCESS_INFORMATION g_streamingServerProcInfo;

// mpv
extern mpv_handle *g_mpv;
extern std::thread g_mpvThread;

// WebView2
extern wil::com_ptr<ICoreWebView2Environment> g_webviewEnv;
extern wil::com_ptr<ICoreWebView2Controller> g_webviewController;
extern wil::com_ptr<ICoreWebView2> g_webview;

// Custom Messages
#define WM_MPV_WAKEUP (WM_APP + 2)
#define WM_AUTH_CODE_RECEIVED (WM_APP + 3)

// Command Hander
extern WebViewProtocol::CommandHandler g_commandHandler;

#endif