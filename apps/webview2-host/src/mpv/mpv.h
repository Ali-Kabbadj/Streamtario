#ifndef PLAYER_H
#define PLAYER_H

#include <string>
#include <vector>
#include <windows.h>

bool InitMPV(HWND hwnd);
void CleanupMPV();

// Event handling
void HandleMpvEvents();

// Commands from the frontend
void HandleMpvCommand(const std::vector<std::string> &args);
void HandleMpvSetProp(const std::vector<std::string> &args);
void HandleMpvObserveProp(const std::vector<std::string> &args);
void HandleMpvRawCommand(const std::string &command_string);

// Specific actions
void pauseMPV(bool allowed);
void playMPV(bool allowed);

#endif