#include "mainwindow.h"
#include "../globals/globals.h"
#include "../mpv/mpv.h"
#include "../logger/logger.h"
#include "../lib/json.hpp"
#include "../webview_protocol/types.h"

using json = nlohmann::json;

LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
    switch (message)
    {
    case WM_SIZE:
        if (g_webviewController != nullptr)
        {
            RECT bounds;
            GetClientRect(hWnd, &bounds);
            g_webviewController->put_Bounds(bounds);
        }
        break;
    case WM_MPV_WAKEUP:
        HandleMpvEvents();
        break;
    
    case WM_AUTH_CODE_RECEIVED:
    {
        WebViewProtocol::AuthResult* result = (WebViewProtocol::AuthResult*)lParam;
        if (result)
        {
            json event_payload = { 
                {"code", result->code},
                {"redirectUri", result->redirectUri} 
            };
            json msg = {
                {"event", "google-auth-code"},
                {"payload", event_payload}
            };
            std::string message_to_js = msg.dump();
            
            LOG_INFO("WndProc", "About to send message to JS: " + message_to_js);
            SendMessageToJS(message_to_js);

            delete result;
            SetForegroundWindow(hWnd);
        }
        break;
    }
    case WM_DESTROY:
        CleanupMPV();
        PostQuitMessage(0);
        break;
    default:
        return DefWindowProc(hWnd, message, wParam, lParam);
    }
    return 0;
}

bool g_isFullscreen = false;
RECT g_windowRect;

void ToggleFullscreen(HWND hWnd)
{
    if (!g_isFullscreen)
    {
        GetWindowRect(hWnd, &g_windowRect);
        MONITORINFO mi = {sizeof(mi)};
        GetMonitorInfo(MonitorFromWindow(hWnd, MONITOR_DEFAULTTONEAREST), &mi);
        SetWindowLong(hWnd, GWL_STYLE, WS_POPUP | WS_VISIBLE);
        SetWindowPos(hWnd,
                     HWND_TOP,
                     mi.rcMonitor.left,
                     mi.rcMonitor.top,
                     mi.rcMonitor.right - mi.rcMonitor.left,
                     mi.rcMonitor.bottom - mi.rcMonitor.top,
                     SWP_NOOWNERZORDER | SWP_FRAMECHANGED);
        g_isFullscreen = true;
    }
    else
    {
        SetWindowLong(hWnd, GWL_STYLE, WS_OVERLAPPEDWINDOW | WS_VISIBLE);
        SetWindowPos(hWnd,
                     NULL,
                     g_windowRect.left,
                     g_windowRect.top,
                     g_windowRect.right - g_windowRect.left,
                     g_windowRect.bottom - g_windowRect.top,
                     SWP_NOOWNERZORDER | SWP_FRAMECHANGED);
        g_isFullscreen = false;
    }
}

void HandleWebMessage(const std::wstring &msg)
{
    g_commandHandler.handleCommand(msg);
}

void SendMessageToJS(const std::string &message)
{
    if (g_webview)
    {
        int size_needed = MultiByteToWideChar(CP_UTF8, 0, &message[0], (int)message.size(), NULL, 0);
        if (size_needed > 0)
        {
            std::wstring wmessage(size_needed, 0);
            MultiByteToWideChar(CP_UTF8, 0, &message[0], (int)message.size(), &wmessage[0], size_needed);
            g_webview->PostWebMessageAsString(wmessage.c_str());
        }
    }
}