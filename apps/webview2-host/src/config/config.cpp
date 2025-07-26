#include <string>
#include <windows.h>

#include "config.h"
#include <pathcch.h>
#pragma comment(lib, "Pathcch.lib")

namespace AppConfig
{

static std::wstring g_configDirectory;

void Initialize()
{
    WCHAR exePath[MAX_PATH];
    GetModuleFileNameW(NULL, exePath, MAX_PATH);

    PathCchRemoveFileSpec(exePath, MAX_PATH);

    g_configDirectory = std::wstring(exePath) + L"\\portable_config";
}

std::wstring GetConfigDirectory()
{
    return g_configDirectory;
}

}// namespace AppConfig