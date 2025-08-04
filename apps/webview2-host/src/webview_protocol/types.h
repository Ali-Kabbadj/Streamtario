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
        std::string url; // Changed from infoHash/fileIndex to a direct URL
    };

    struct SeekPayload
    {
        double time;
    };

    struct SetVolumePayload
    {
        int volume;
    };

    struct SetWebViewVisibilityPayload
    {
        bool visible;
    };

    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(PlayPayload, url)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(SeekPayload, time)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(SetVolumePayload, volume)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(SetWebViewVisibilityPayload, visible)

    //================================================================
    // OUTGOING EVENTS (From C++ -> Frontend)
    //================================================================

    struct PropertyChangeEventPayload
    {
        std::string property;
        json value;
    };

    // NEW: This defines the payload for our error event
    struct PlaybackErrorEventPayload
    {
        std::string message;
    };

    // This macro serializes our C++ structs into JSON.
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(PropertyChangeEventPayload, property, value)
    NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(PlaybackErrorEventPayload, message) // Add the macro for the new type

} // namespace WebViewProtocol

#endif // WEBVIEW_PROTOCOL_TYPES_H