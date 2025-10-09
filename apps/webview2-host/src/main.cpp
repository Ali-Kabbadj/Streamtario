#include <iostream>
#include <windows.h>
#include <processthreadsapi.h>
#include <pathcch.h>
#pragma comment(lib, "Pathcch.lib")
#include "globals/globals.h"
#include "mainwindow/mainwindow.h"
#include "webview/webview.h"
#include "mpv/mpv.h"
#include "config/config.h"
#include "logger/logger.h"
#include "helpers/helpers.h"

#define IDI_APPICON 101

#ifndef _DEBUG
void AssignProcessToJob(HANDLE hJob, HANDLE hProcess)
{
    if (hJob && hProcess)
    {
        if (!AssignProcessToJobObject(hJob, hProcess))
        {
            LOG_ERROR("JobObject", "Failed to assign process to job.");
        }
    }
}

void LaunchProcess(const std::wstring &command,
                   const std::wstring &args,
                   const std::wstring &working_dir,
                   PROCESS_INFORMATION &proc_info)
{
    STARTUPINFOW si = {sizeof(si)};
    std::wstring full_command = L"\"" + command + L"\" " + args;
    wchar_t *cmd_line_writable = &full_command[0];

    if (CreateProcessW(
            NULL, cmd_line_writable, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, working_dir.c_str(), &si, &proc_info))
    {
        LOG_INFO("ProcessManager", "Launched: " + wstring_to_string(command));
        AssignProcessToJob(g_jobHandle, proc_info.hProcess);
    }
    else
    {
        LOG_ERROR("ProcessManager", "FAILED to launch: " + wstring_to_string(command));
    }
}

void LaunchChildProcesses(const std::wstring &app_dir)
{
    std::wstring data_api_path = app_dir + L"\\data-api.exe";
    LaunchProcess(data_api_path, L"", app_dir, g_dataApiProcInfo);

    SetEnvironmentVariableW(L"NODE_ENV", L"production");

    std::wstring node_path = app_dir + L"\\node.exe";
    std::wstring streaming_server_script = app_dir + L"\\streaming-server\\dist\\app.js";
    std::wstring streaming_server_dir = app_dir + L"\\streaming-server";

    LaunchProcess(node_path, L"\"" + streaming_server_script + L"\"", streaming_server_dir, g_streamingServerProcInfo);
    SetEnvironmentVariableW(L"NODE_ENV", nullptr);
}

void CleanupChildProcesses()
{
    if (g_jobHandle)
    {
        CloseHandle(g_jobHandle);
        g_jobHandle = NULL;
    }
    if (g_dataApiProcInfo.hProcess)
        CloseHandle(g_dataApiProcInfo.hProcess);
    if (g_dataApiProcInfo.hThread)
        CloseHandle(g_dataApiProcInfo.hThread);
    if (g_streamingServerProcInfo.hProcess)
        CloseHandle(g_streamingServerProcInfo.hProcess);
    if (g_streamingServerProcInfo.hThread)
        CloseHandle(g_streamingServerProcInfo.hThread);
}
#endif // !_DEBUG

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
    WCHAR exe_path_buf[MAX_PATH];
    GetModuleFileNameW(NULL, exe_path_buf, MAX_PATH);
    PathCchRemoveFileSpec(exe_path_buf, MAX_PATH);
    std::wstring app_directory(exe_path_buf);
    Logger::Init(app_directory + L"\\logs");

    AppConfig::Initialize();
    g_hInst = hInstance;

#ifndef _DEBUG
    g_jobHandle = CreateJobObject(NULL, NULL);
    if (g_jobHandle)
    {
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION jeli = {0};
        jeli.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if (!SetInformationJobObject(g_jobHandle, JobObjectExtendedLimitInformation, &jeli, sizeof(jeli)))
        {
            LOG_ERROR("JobObject", "Could not set job object information.");
        }
    }
    else
    {
        LOG_ERROR("JobObject", "Could not create job object.");
    }
    LaunchChildProcesses(app_directory);
#endif

    WNDCLASSW wc = {};
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = g_szWindowClass;
    wc.hIcon = LoadIconW(hInstance, MAKEINTRESOURCEW(IDI_APPICON));
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)GetStockObject(BLACK_BRUSH);
    RegisterClassW(&wc);

    g_hWnd = CreateWindowExW(0,
                             g_szWindowClass,
                             g_szTitle,
                             WS_OVERLAPPEDWINDOW,
                             CW_USEDEFAULT,
                             CW_USEDEFAULT,
                             1280,
                             800,
                             nullptr,
                             nullptr,
                             hInstance,
                             nullptr);

    if (g_hWnd == nullptr)
        return 0;

    ShowWindow(g_hWnd, nCmdShow);

    if (!InitMPV(g_hWnd))
    {
        MessageBoxW(g_hWnd, L"Fatal Error", L"Failed to initialize the MPV player.", MB_ICONERROR);
        return 1;
    }

    InitMainWebView(g_hWnd, app_directory);

    MSG msg = {};
    while (GetMessage(&msg, nullptr, 0, 0) > 0)
    {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    CleanupMPV();
    Logger::Cleanup();

#ifndef _DEBUG
    CleanupChildProcesses();
#endif

    return 0;
}