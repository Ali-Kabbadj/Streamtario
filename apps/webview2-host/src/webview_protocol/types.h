#ifndef WEBVIEW_PROTOCOL_TYPES_H
#define WEBVIEW_PROTOCOL_TYPES_H

#include <string>
#include <vector>
#include "../lib/json.hpp"

using json = nlohmann::json;

namespace WebViewProtocol
{

    //================================================================
    // INCOMING COMMANDS (From Frontend -> C++)
    //================================================================

    struct PlayPayload
    {
        std::string url;
        double startTime = 0.0;
    };

    struct SeekPayload
    {
        double time;
    };

    struct SetVolumePayload
    {
        int volume;
    };

    struct SetPropertyPayload
    {
        std::string property;
        std::string value;
    };

    struct SetWebViewVisibilityPayload
    {
        bool visible;
    };

    struct LoadSubtitlePayload
    {
        std::string url;
    };

    struct RawCommandPayload
    {
        std::string command_string;
    };

    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(PlayPayload, url, startTime)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(SeekPayload, time)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(SetVolumePayload, volume)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(SetPropertyPayload, property, value)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(SetWebViewVisibilityPayload, visible)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(LoadSubtitlePayload, url)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(RawCommandPayload, command_string)

    //================================================================
    // OUTGOING EVENTS (From C++ -> Frontend)
    //================================================================

    struct PropertyChangeEventPayload
    {
        std::string property;
        json value;
    };

    struct PlaybackErrorEventPayload
    {
        std::string message;
    };

    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(PropertyChangeEventPayload, property, value)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(PlaybackErrorEventPayload, message)

} // namespace WebViewProtocol

#endif // WEBVIEW_PROTOCOL_TYPES_H