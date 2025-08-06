#include "command_handler.h"
#include "../../helpers/helpers.h"
#include "../../logger/logger.h"
#include "../../mpv/mpv.h"
#include "../../mainwindow/mainwindow.h"
#include <globals/globals.h>

namespace WebViewProtocol
{

    CommandHandler::CommandHandler()
    {
        m_commands["play"] = [](const json &payload)
        {
            auto p = payload.get<PlayPayload>();
            if (p.url.empty())
            {
                LOG_ERROR("CommandHandler", "Play command received with empty URL.");
                return;
            }
            g_isMpvPlaying = true;

            // Always set the start time to ensure no stale state from previous playback
            HandleMpvCommand({"set", "start", std::to_string(p.startTime)});

            HandleMpvCommand({"loadfile", p.url, "replace"});
        };

        m_commands["stop"] = [](const json &)
        {
            if (g_isMpvPlaying)
            {
                g_isMpvPlaying = false;
                HandleMpvCommand({"stop"});
            }
        };

        m_commands["toggle-pause"] = [](const json &)
        { HandleMpvCommand({"cycle", "pause"}); };

        m_commands["seek"] = [](const json &payload)
        {
            auto p = payload.get<SeekPayload>();
            HandleMpvCommand({"seek", std::to_string(p.time), "absolute"});
        };

        m_commands["set-volume"] = [](const json &payload)
        {
            auto p = payload.get<SetVolumePayload>();
            HandleMpvCommand({"set", "volume", std::to_string(p.volume)});
        };

        m_commands["toggle-mute"] = [](const json &)
        { HandleMpvCommand({"cycle", "mute"}); };

        m_commands["toggle-fullscreen"] = [](const json &)
        { ToggleFullscreen(g_hWnd); };
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
        catch (json::parse_error &e)
        {
            LOG_ERROR("CommandHandler", "JSON Parse Error: " + std::string(e.what()));
        }
        catch (json::out_of_range &e)
        {
            LOG_ERROR("CommandHandler", "JSON Key Error: " + std::string(e.what()));
        }
    }
} // namespace WebViewProtocol