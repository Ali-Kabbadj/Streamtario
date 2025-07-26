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
    std::string infoHash;
    int         fileIndex;
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

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(PlayPayload, infoHash, fileIndex)
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(SeekPayload, time)
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(SetVolumePayload, volume)
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(SetWebViewVisibilityPayload, visible)

//================================================================
// OUTGOING EVENTS (From C++ -> Frontend)
//================================================================

struct PropertyChangeEventPayload
{
    std::string property;
    json        value;
};

// This macro serializes our C++ structs into JSON.
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(PropertyChangeEventPayload, property, value)

}// namespace WebViewProtocol

#endif// WEBVIEW_PROTOCOL_TYPES_H