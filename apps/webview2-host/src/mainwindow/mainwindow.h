#ifndef MAINWINDOW_H
#define MAINWINDOW_H
#include <string>
#include <windows.h>

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);
void HandleWebMessage(const std::wstring &msg);
void ToggleFullscreen(HWND hWnd);
void SendMessageToJS(const std::string &message);
#endif