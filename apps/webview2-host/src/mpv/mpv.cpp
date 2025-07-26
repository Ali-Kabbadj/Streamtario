#include "mpv.h"
#include "logger/logger.h"
#include "../config/config.h"
#include "../globals/globals.h"
#include "../mainwindow/mainwindow.h"
#include <iostream>
#include <string>
#include <webview_protocol/event_emitter/event_emitter.h>

static void MpvWakeup(void *ctx)
{
    // LOG_INFO("MPV_Thread", "MpvWakeup callback initiated.");
    PostMessage((HWND)ctx, WM_MPV_WAKEUP, 0, 0);
}

void HandleMpvEvents()
{
    if (!g_mpv)
    {
        LOG_INFO("UI_Thread", "g_mpv null, exiting HandleMpvEvents.");
        return;
    };
    while (true)
    {
        mpv_event *ev = mpv_wait_event(g_mpv, 0);
        if (!ev || ev->event_id == MPV_EVENT_NONE) { break; }

        switch (ev->event_id)
        {
        case MPV_EVENT_LOG_MESSAGE:
            Logger::LogMpv((mpv_event_log_message *)ev->data);
            break;

        case MPV_EVENT_PROPERTY_CHANGE:
        {
            mpv_event_property *prop = (mpv_event_property *)ev->data;
            if (prop->data == NULL) break;
            json value;
            if (prop->format == MPV_FORMAT_DOUBLE) { value = *(double *)prop->data; }
            else if (prop->format == MPV_FORMAT_FLAG) { value = (*(int *)prop->data ? true : false); }
            else if (prop->format == MPV_FORMAT_INT64) { value = *(int64_t *)prop->data; }
            else { continue; }

            WebViewProtocol::EventEmitter::emitPropertyChange(prop->name, value);
            break;
        }

        case MPV_EVENT_FILE_LOADED:
        {
            LOG_INFO("MPV_Event", "MPV_EVENT_FILE_LOADED received. Checking for resume position.");

            double startTime = 0;
            // The "start" property is automatically populated by mpv from the watch_later file.
            if (mpv_get_property(g_mpv, "start", MPV_FORMAT_DOUBLE, &startTime) == 0 && startTime > 1.0)
            {
                std::string timeStr = std::to_string(startTime);
                HandleMpvCommand({ "seek", timeStr, "absolute" });
                LOG_INFO("MPV_Event", "Found resume time. Issued explicit seek to: " + timeStr + "s");
            }

            // Proactively send the initial state to the frontend
            double  duration  = 0;
            int64_t volume    = 0;
            int     is_paused = 1;
            int     is_muted  = 0;

            mpv_get_property(g_mpv, "duration", MPV_FORMAT_DOUBLE, &duration);
            mpv_get_property(g_mpv, "volume", MPV_FORMAT_INT64, &volume);
            mpv_get_property(g_mpv, "pause", MPV_FORMAT_FLAG, &is_paused);
            mpv_get_property(g_mpv, "mute", MPV_FORMAT_FLAG, &is_muted);

            WebViewProtocol::EventEmitter::emitPropertyChange("duration", duration);
            WebViewProtocol::EventEmitter::emitPropertyChange("volume", volume);
            WebViewProtocol::EventEmitter::emitPropertyChange("pause", is_paused != 0);
            WebViewProtocol::EventEmitter::emitPropertyChange("mute", is_muted != 0);
            break;
        }

        case MPV_EVENT_END_FILE:
        {
            if (g_isMpvPlaying)
            {
                LOG_INFO("MPV_Event", "Playback finished naturally.");
                g_isMpvPlaying = false;
                WebViewProtocol::EventEmitter::emitPlaybackEnded();
            }
            else { LOG_INFO("MPV_Event", "Playback stopped by user command."); }
            break;
        }
        case MPV_EVENT_SHUTDOWN:
        {
            LOG_INFO("MPV_Event", "MPV is shutting down.");
            mpv_terminate_destroy(g_mpv);
            g_mpv = nullptr;
            break;
        }
        default:
            break;
        }
    }
}

// Handles commands like "loadfile"
void HandleMpvCommand(const std::vector<std::string> &args)
{
    if (!g_mpv || args.empty())
    {
        LOG_INFO("UI_Thread", "g_mpv null or args empty exiting out of HandleMpvCommand");
        return;
    }

    LOG_INFO("UI_Thread", "Sending command to MPV: " + args[0]);

    // Convert std::string to const char* for the C API
    std::vector<const char *> cargs;
    for (const auto &s : args) { cargs.push_back(s.c_str()); }
    cargs.push_back(nullptr);// The array must be null-terminated

    // Send the command to the MPV engine
    mpv_command_async(g_mpv, 0, cargs.data());

    // After sending a command, we must explicitly wake up the mpv event loop
    // to ensure it processes the command and any resulting events immediately.
    mpv_wakeup(g_mpv);
}

void HandleMpvSetProp(const std::vector<std::string> &args)
{
    if (!g_mpv || args.size() < 2) return;
    std::string val = args[1];
    if (val == "true") val = "yes";
    if (val == "false") val = "no";
    mpv_set_property_string(g_mpv, args[0].c_str(), val.c_str());

    // Also wake up after setting a property
    mpv_wakeup(g_mpv);
}

// Not used yet, but good to have
void HandleMpvObserveProp(const std::vector<std::string> &args)
{
    if (!g_mpv || args.empty()) return;
    mpv_observe_property(g_mpv, 0, args[0].c_str(), MPV_FORMAT_NODE);
}

void pauseMPV(bool allowed)
{
    if (!allowed) return;
    HandleMpvSetProp({ "pause", "true" });
}

void playMPV(bool allowed)
{
    if (!allowed) return;
    HandleMpvSetProp({ "pause", "false" });
}

bool InitMPV(HWND hwnd)
{
    g_mpv = mpv_create();
    if (!g_mpv) return false;

    int64_t wid = (int64_t)hwnd;
    mpv_set_option(g_mpv, "wid", MPV_FORMAT_INT64, &wid);
    mpv_set_option_string(g_mpv, "vo", "gpu-next");

    // === USE PORTABLE CONFIGURATION ===
    std::wstring configDirW  = AppConfig::GetConfigDirectory();
    int          size_needed = WideCharToMultiByte(CP_UTF8, 0, configDirW.c_str(), -1, NULL, 0, NULL, NULL);
    std::string  configDirA(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, configDirW.c_str(), -1, &configDirA[0], size_needed, NULL, NULL);

    mpv_set_option_string(g_mpv, "config", "yes");
    mpv_set_option_string(g_mpv, "config-dir", configDirA.c_str());

    //  Enable and configure watch_later for position saving ---
    std::wstring watchLaterDirW = configDirW + L"\\watch_later";
    int          size_needed_wl = WideCharToMultiByte(CP_UTF8, 0, watchLaterDirW.c_str(), -1, NULL, 0, NULL, NULL);
    std::string  watchLaterDirA(size_needed_wl, 0);
    WideCharToMultiByte(CP_UTF8, 0, watchLaterDirW.c_str(), -1, &watchLaterDirA[0], size_needed_wl, NULL, NULL);

    mpv_set_option_string(g_mpv, "watch-later-directory", watchLaterDirA.c_str());
    mpv_set_option_string(g_mpv, "save-position-on-quit", "yes");
    // --- END watch_later config ---

    mpv_set_option_string(g_mpv, "volume", "0");

    // mpv logging
    mpv_set_option_string(g_mpv, "terminal", "no");
    mpv_set_option_string(g_mpv, "msg-level", "all=v");
    mpv_set_option_string(g_mpv, "log-file", "NUL");
    mpv_request_log_messages(g_mpv, "v");

    // Other options
    mpv_set_property_string(g_mpv, "cache", "yes");
    mpv_set_property_string(g_mpv, "cache-secs", "60");

    mpv_set_wakeup_callback(g_mpv, MpvWakeup, hwnd);
    if (mpv_initialize(g_mpv) < 0)
    {
        LOG_ERROR("MPV_Init", "mpv_initialize failed. error");
        return false;
    }

    // Observe properties for UI updates
    mpv_observe_property(g_mpv, 0, "time-pos", MPV_FORMAT_DOUBLE);
    mpv_observe_property(g_mpv, 0, "duration", MPV_FORMAT_DOUBLE);
    mpv_observe_property(g_mpv, 0, "pause", MPV_FORMAT_FLAG);
    mpv_observe_property(g_mpv, 0, "volume", MPV_FORMAT_INT64);
    mpv_observe_property(g_mpv, 0, "mute", MPV_FORMAT_FLAG);

    LOG_INFO("MPV_Init", "MPV Initialized Successfully.");
    return true;
}

void CleanupMPV()
{
    if (g_mpv)
    {
        LOG_INFO("MPV_Cleanup", "CleanupMPV called.");
        mpv_command_string(g_mpv, "quit");
        if (g_mpvThread.joinable()) { g_mpvThread.join(); }
        // mpv_terminate_destroy is called by the shutdown event, but we can call it here as a fallback
        // mpv_terminate_destroy(g_mpv);
        g_mpv = nullptr;
        LOG_INFO("MPV_Cleanup", "Cleaned up MPV instance.");
    }
}