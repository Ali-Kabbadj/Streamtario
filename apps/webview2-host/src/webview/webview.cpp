#include "../globals/globals.h"
#include "../mainwindow/mainwindow.h"
#include <filesystem>
#include "webview.h"
#include <string>
#include <wrl.h>
#include "config/config.h"

using namespace Microsoft::WRL;

void InitMainWebView(HWND hWnd, const std::wstring &app_path)
{
  std::wstring webview_data_dir = AppConfig::GetConfigDirectory() + L"\\WebView2_Data";
  CreateCoreWebView2EnvironmentWithOptions(
      nullptr,
      webview_data_dir.c_str(),
      nullptr,
      Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
          [hWnd, app_path](HRESULT result, ICoreWebView2Environment *env) -> HRESULT
          {
            g_webviewEnv = env;

            g_webviewEnv->CreateCoreWebView2Controller(hWnd,
                                              Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                                                  [hWnd, app_path](HRESULT result, ICoreWebView2Controller *controller) -> HRESULT
                                                  {
                                                    if (controller != nullptr)
                                                    {
                                                      g_webviewController = controller;
                                                      g_webviewController->get_CoreWebView2(&g_webview);

                                                      wil::com_ptr<ICoreWebView2Controller2> controller2 = g_webviewController.try_query<ICoreWebView2Controller2>();
                                                      if (controller2)
                                                      {
                                                        controller2->put_DefaultBackgroundColor({0, 0, 0, 0});
                                                      }
                                                    }

                                                    RECT bounds;
                                                    GetClientRect(hWnd, &bounds);
                                                    g_webviewController->put_Bounds(bounds);

#ifdef _DEBUG
                                                    g_webview->Navigate(L"https://localhost:3000");
#else
                                                    std::wstring web_assets_path = app_path + L"\\www";
                                                    wil::com_ptr<ICoreWebView2_3> webview3 = g_webview.try_query<ICoreWebView2_3>();
                                                    if (webview3)
                                                    {
                                                      webview3->SetVirtualHostNameToFolderMapping(
                                                          L"streamtario.app", web_assets_path.c_str(), COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW);
                                                    }
                                                    g_webview->Navigate(L"https://streamtario.app/index.html");
#endif

                                                    EventRegistrationToken token;
                                                    g_webview->add_WebMessageReceived(
                                                        Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                                                            [](ICoreWebView2 *webview, ICoreWebView2WebMessageReceivedEventArgs *args) -> HRESULT
                                                            {
                                                              wil::unique_cotaskmem_string message;
                                                              args->TryGetWebMessageAsString(&message);
                                                              HandleWebMessage(message.get());
                                                              return S_OK;
                                                            })
                                                            .Get(),
                                                        &token);

                                                    return S_OK;
                                                  })
                                                  .Get());
            return S_OK;
          })
          .Get());
}