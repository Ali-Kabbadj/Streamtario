#include "mpv.h"
#include "logger/logger.h"
#include "../config/config.h"
#include "../globals/globals.h"
#include "../mainwindow/mainwindow.h"
#include <iostream>
#include <string>
#include <webview_protocol/event_emitter/event_emitter.h>

json MpvNodeToJson(const mpv_node *node)
{
    switch (node->format)
    {
    case MPV_FORMAT_STRING:
        return std::string(node->u.string);
    case MPV_FORMAT_FLAG:
        return (bool)node->u.flag;
    case MPV_FORMAT_INT64:
        return node->u.int64;
    case MPV_FORMAT_DOUBLE:
        return node->u.double_;
    case MPV_FORMAT_NODE_ARRAY:
    {
        json j_array = json::array();
        mpv_node_list *list = node->u.list;
        for (int i = 0; i < list->num; i++)
        {
            j_array.push_back(MpvNodeToJson(&list->values[i]));
        }
        return j_array;
    }
    case MPV_FORMAT_NODE_MAP:
    {
        json j_map = json::object();
        mpv_node_list *list = node->u.list;
        for (int i = 0; i < list->num; i++)
        {
            j_map[list->keys[i]] = MpvNodeToJson(&list->values[i]);
        }
        return j_map;
    }
    case MPV_FORMAT_NONE:
    default:
        return nullptr;
    }
}

static void MpvWakeup(void *ctx)
{
    PostMessage((HWND)ctx, WM_MPV_WAKEUP, 0, 0);
}

void HandleMpvEvents()
{
    if (!g_mpv)
        return;

    while (true)
    {
        mpv_event *ev = mpv_wait_event(g_mpv, 0);
        if (!ev || ev->event_id == MPV_EVENT_NONE)
        {
            break;
        }

        switch (ev->event_id)
        {
        case MPV_EVENT_LOG_MESSAGE:
            Logger::LogMpv((mpv_event_log_message *)ev->data);
            break;

        case MPV_EVENT_PROPERTY_CHANGE:
        {
            mpv_event_property *prop = (mpv_event_property *)ev->data;
            if (prop->data == NULL)
                break;

            json value;
            switch (prop->format)
            {
            case MPV_FORMAT_DOUBLE:
                value = *(double *)prop->data;
                break;
            case MPV_FORMAT_FLAG:
                value = (*(int *)prop->data != 0);
                break;
            case MPV_FORMAT_INT64:
                value = *(int64_t *)prop->data;
                break;
            case MPV_FORMAT_NODE:
                value = MpvNodeToJson((mpv_node *)prop->data);
                break;
            default:
                continue;
            }
            WebViewProtocol::EventEmitter::emitPropertyChange(prop->name, value);
            break;
        }

        case MPV_EVENT_FILE_LOADED:
        {
            g_isMpvPlaying = true;
            LOG_INFO("MPV_Event", "MPV_EVENT_FILE_LOADED received. Querying initial state.");

            double duration = 0;
            int64_t volume = 0;
            int is_paused = 1;
            int is_muted = 0;

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
            g_isMpvPlaying = false;
            mpv_event_end_file *end_file_info = (mpv_event_end_file *)ev->data;
            if (end_file_info->reason == MPV_END_FILE_REASON_ERROR)
            {
                std::string error_message = "Playback failed.";
                if (end_file_info->error != 0)
                {
                    error_message = mpv_error_string(end_file_info->error);
                }
                LOG_ERROR("MPV_Event", "Playback ended with error: " + error_message);
                WebViewProtocol::EventEmitter::emitPlaybackError(error_message);
            }
            else
            {
                LOG_INFO("MPV_Event", "Playback finished or stopped.");
                WebViewProtocol::EventEmitter::emitPlaybackEnded();
            }
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
void HandleMpvCommand(const std::vector<std::string> &args)
{
    if (!g_mpv || args.empty())
    {
        LOG_INFO("UI_Thread", "g_mpv null or args empty exiting out of HandleMpvCommand");
        return;
    }

    std::string full_command_for_log = "";
    for (const auto &s : args)
    {
        full_command_for_log += s + " ";
    }
    LOG_INFO("UI_Thread", "Sending command array to MPV: " + full_command_for_log);

    std::vector<const char *> cargs;
    for (const auto &s : args)
    {
        cargs.push_back(s.c_str());
    }
    cargs.push_back(nullptr);
    mpv_command_async(g_mpv, 0, cargs.data());
}

void HandleMpvRawCommand(const std::string &command_string)
{
    if (!g_mpv)
        return;
    LOG_INFO("UI_Thread", "Sending raw command string to MPV: " + command_string);
    mpv_command_string(g_mpv, command_string.c_str());
}

void HandleMpvSetProp(const std::vector<std::string> &args)
{
    if (!g_mpv || args.size() < 2)
        return;
    std::string val = args[1];
    if (val == "true")
        val = "yes";
    if (val == "false")
        val = "no";
    mpv_set_property_string(g_mpv, args[0].c_str(), val.c_str());
    mpv_wakeup(g_mpv);
}

void HandleMpvObserveProp(const std::vector<std::string> &args)
{
    if (!g_mpv || args.empty())
        return;
    mpv_observe_property(g_mpv, 0, args[0].c_str(), MPV_FORMAT_NODE);
}

void pauseMPV(bool allowed)
{
    if (!allowed)
        return;
    HandleMpvSetProp({"pause", "true"});
}

void playMPV(bool allowed)
{
    if (!allowed)
        return;
    HandleMpvSetProp({"pause", "false"});
}

bool InitMPV(HWND hwnd)
{
    g_mpv = mpv_create();
    if (!g_mpv)
        return false;

    int64_t wid = (int64_t)hwnd;
    mpv_set_option(g_mpv, "wid", MPV_FORMAT_INT64, &wid);
    mpv_set_option_string(g_mpv, "vo", "gpu-next");
    mpv_set_option_string(g_mpv, "tls-verify", "no");

    std::wstring configDirW = AppConfig::GetConfigDirectory();
    int size_needed = WideCharToMultiByte(CP_UTF8, 0, configDirW.c_str(), -1, NULL, 0, NULL, NULL);
    std::string configDirA(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, configDirW.c_str(), -1, &configDirA[0], size_needed, NULL, NULL);

    mpv_set_option_string(g_mpv, "config", "yes");
    mpv_set_option_string(g_mpv, "config-dir", configDirA.c_str());

    mpv_set_option_string(g_mpv, "save-position-on-quit", "no");

    mpv_set_option_string(g_mpv, "volume", "0");

    mpv_set_option_string(g_mpv, "terminal", "no");
    mpv_set_option_string(g_mpv, "msg-level", "all=v");
    mpv_set_option_string(g_mpv, "log-file", "NUL");
    mpv_request_log_messages(g_mpv, "v");

    mpv_set_property_string(g_mpv, "cache", "yes");
    mpv_set_property_string(g_mpv, "cache-secs", "60");

    mpv_set_wakeup_callback(g_mpv, MpvWakeup, hwnd);
    if (mpv_initialize(g_mpv) < 0)
    {
        LOG_ERROR("MPV_Init", "mpv_initialize failed. error");
        return false;
    }

    mpv_observe_property(g_mpv, 0, "time-pos", MPV_FORMAT_DOUBLE);
    mpv_observe_property(g_mpv, 0, "duration", MPV_FORMAT_DOUBLE);
    mpv_observe_property(g_mpv, 0, "pause", MPV_FORMAT_FLAG);
    mpv_observe_property(g_mpv, 0, "volume", MPV_FORMAT_INT64);
    mpv_observe_property(g_mpv, 0, "mute", MPV_FORMAT_FLAG);
    mpv_observe_property(g_mpv, 0, "paused-for-cache", MPV_FORMAT_FLAG);
    mpv_observe_property(g_mpv, 0, "track-list", MPV_FORMAT_NODE);

    LOG_INFO("MPV_Init", "MPV Initialized Successfully.");
    return true;
}

void CleanupMPV()
{
    if (g_mpv)
    {
        LOG_INFO("MPV_Cleanup", "CleanupMPV called.");
        mpv_command_string(g_mpv, "quit");
        if (g_mpvThread.joinable())
        {
            g_mpvThread.join();
        }
        g_mpv = nullptr;
        LOG_INFO("MPV_Cleanup", "Cleaned up MPV instance.");
    }
}