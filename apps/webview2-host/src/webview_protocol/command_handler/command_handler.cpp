#include "command_handler.h"
#include "../../helpers/helpers.h"
#include "../../logger/logger.h"
#include "../../mpv/mpv.h"
#include "../../mainwindow/mainwindow.h"
#include <globals/globals.h>
#include <string>
#include <sstream>
#include "../types.h"

using namespace Microsoft::WRL;

namespace WebViewProtocol
{

    struct PopupContext {
        Microsoft::WRL::ComPtr<ICoreWebView2Controller> controller;
        Microsoft::WRL::ComPtr<ICoreWebView2> webview;
        EventRegistrationToken navToken{};
    };

    LRESULT CALLBACK AuthPopupWndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
    {
        switch (message)
        {
        case WM_SIZE:
        {
            PopupContext* ctx = (PopupContext*)GetWindowLongPtr(hWnd, GWLP_USERDATA);
            if (ctx && ctx->controller)
            {
                RECT bounds;
                GetClientRect(hWnd, &bounds);
                ctx->controller->put_Bounds(bounds);
            }
            break;
        }
        case WM_CLOSE:
            DestroyWindow(hWnd);
            break;
        case WM_DESTROY:
        {
            PopupContext* ctx = (PopupContext*)GetWindowLongPtr(hWnd, GWLP_USERDATA);
            if (ctx)
            {
                if (ctx->webview && ctx->navToken.value != 0)
                {
                    ctx->webview->remove_NavigationStarting(ctx->navToken);
                }
                delete ctx;
                SetWindowLongPtr(hWnd, GWLP_USERDATA, 0);
            }
            EnableWindow(g_hWnd, TRUE);
            SetFocus(g_hWnd); // A gentler way to request focus.
            break;
        }
        default:
            return DefWindowProc(hWnd, message, wParam, lParam);
        }
        return 0;
    }

    CommandHandler::CommandHandler()
    {
        m_commands["begin-google-auth"] = [](const json &payload)
        {
            if (!g_webviewEnv) {
                LOG_ERROR("CommandHandler", "WebView2 Environment not available.");
                return;
            }
            auto p = payload.get<BeginGoogleAuthPayload>();
            if (p.clientId.empty()) {
                LOG_ERROR("CommandHandler", "begin-google-auth: empty client ID.");
                return;
            }

            EnableWindow(g_hWnd, FALSE);

            const WCHAR AUTH_POPUP_CLASS[] = L"AuthPopupClass";
            WNDCLASSW wc = {};
            wc.lpfnWndProc = AuthPopupWndProc;
            wc.hInstance = g_hInst;
            wc.lpszClassName = AUTH_POPUP_CLASS;
            RegisterClassW(&wc);

            HWND hWndPopup = CreateWindowExW(
                WS_EX_CLIENTEDGE, AUTH_POPUP_CLASS, L"Sign in to Google",
                WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT, 800, 600,
                g_hWnd, nullptr, g_hInst, nullptr);

            if (hWndPopup == nullptr) {
                LOG_ERROR("CommandHandler", "Failed to create auth popup window.");
                EnableWindow(g_hWnd, TRUE);
                return;
            }

            PopupContext* ctx = new PopupContext();
            SetWindowLongPtr(hWndPopup, GWLP_USERDATA, (LONG_PTR)ctx);

            ShowWindow(hWndPopup, SW_SHOW);
            UpdateWindow(hWndPopup);
            
            std::string redirectUri = "http://127.0.0.1";
            #ifdef _DEBUG
                redirectUri = "https://localhost:3000";
            #endif

            g_webviewEnv->CreateCoreWebView2Controller(hWndPopup, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                [hWndPopup, p, ctx, redirectUri](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
                    if (FAILED(result) || controller == nullptr) {
                        LOG_ERROR("CommandHandler", "Failed to create WebView2 controller for popup.");
                        PostMessage(hWndPopup, WM_CLOSE, 0, 0);
                        return E_FAIL;
                    }

                    ctx->controller = controller;
                    controller->get_CoreWebView2(&ctx->webview);

                    RECT bounds;
                    GetClientRect(hWndPopup, &bounds);
                    controller->put_Bounds(bounds);
                    controller->put_IsVisible(TRUE);

                    ctx->webview->add_NavigationStarting(Callback<ICoreWebView2NavigationStartingEventHandler>(
                        [hWndPopup, redirectUri](ICoreWebView2* sender, ICoreWebView2NavigationStartingEventArgs* args) -> HRESULT {
                            wil::unique_cotaskmem_string uri;
                            args->get_Uri(&uri);
                            std::wstring url(uri.get());

                            if (url.rfind(string_to_wstring(redirectUri), 0) == 0) {
                                LOG_INFO("AuthPopup", "Redirect captured.");
                                args->put_Cancel(true);

                                size_t codePos = url.find(L"code=");
                                if (codePos != std::wstring::npos) {
                                    size_t endPos = url.find(L"&", codePos);
                                    std::wstring codeW = (endPos == std::wstring::npos) ? url.substr(codePos + 5) : url.substr(codePos + 5, endPos - (codePos + 5));
                                    std::string code = wstring_to_string(codeW);
                                    
                                    AuthResult* result_ptr = new AuthResult{code, redirectUri};
                                    PostMessage(g_hWnd, WM_AUTH_CODE_RECEIVED, 0, (LPARAM)result_ptr);
                                }
                                
                                DestroyWindow(hWndPopup);
                            }
                            return S_OK;
                        }).Get(), &ctx->navToken);

                    std::ostringstream ss;
                    ss << "https://accounts.google.com/o/oauth2/v2/auth?"
                    << "client_id=" << p.clientId
                    << "&redirect_uri=" << redirectUri
                    << "&response_type=code"
                    << "&scope=openid%20email%20profile"
                    << "&access_type=offline"
                    << "&prompt=consent";

                    std::string authUrl = ss.str();
                    ctx->webview->Navigate(string_to_wstring(authUrl).c_str());
                    ctx->controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);

                    return S_OK;
                }).Get());
        };
        m_commands["play"] = [](const json &payload)
        {
            auto p = payload.get<PlayPayload>();
            if (p.url.empty()){ LOG_ERROR("CommandHandler", "Play command received with empty URL."); return; }
            g_isMpvPlaying = true;
            HandleMpvCommand({"set", "start", std::to_string(p.startTime)});
            HandleMpvCommand({"loadfile", p.url, "replace"});
        };
        m_commands["stop"] = [](const json &){ if (g_isMpvPlaying){ g_isMpvPlaying = false; HandleMpvCommand({"stop"}); } };
        m_commands["toggle-pause"] = [](const json &){ HandleMpvCommand({"cycle", "pause"}); };
        m_commands["seek"] = [](const json &payload){ auto p = payload.get<SeekPayload>(); HandleMpvCommand({"seek", std::to_string(p.time), "absolute"}); };
        m_commands["set-volume"] = [](const json &payload){ auto p = payload.get<SetVolumePayload>(); HandleMpvCommand({"set", "volume", std::to_string(p.volume)}); };
        m_commands["toggle-mute"] = [](const json &){ HandleMpvCommand({"cycle", "mute"}); };
        m_commands["toggle-fullscreen"] = [](const json &){ ToggleFullscreen(g_hWnd); };
        m_commands["set-property"] = [](const json &payload){ auto p = payload.get<SetPropertyPayload>(); HandleMpvCommand({"set", p.property, p.value}); };
        m_commands["load-subtitle"] = [](const json &payload){ auto p = payload.get<LoadSubtitlePayload>(); HandleMpvCommand({"sub-add", p.url, "select", p.url}); };
    }

    void CommandHandler::handleCommand(const std::wstring &message_w)
    {
        std::string message_s = wstring_to_string(message_w);
        LOG_INFO("CommandHandler", "Received command: " + message_s);
        try
        {
            json j = json::parse(message_s);
            std::string command = j.at("command").get<std::string>();
            auto it = m_commands.find(command);
            if (it != m_commands.end())
            {
                it->second(j.value("payload", json::object()));
            }
            else
            {
                LOG_WARN("CommandHandler", "Unknown command received: " + command);
            }
        }
        catch (json::parse_error &e) { LOG_ERROR("CommandHandler", "JSON Parse Error: " + std::string(e.what())); }
        catch (json::out_of_range &e) { LOG_ERROR("CommandHandler", "JSON Key Error: " + std::string(e.what())); }
    }
}