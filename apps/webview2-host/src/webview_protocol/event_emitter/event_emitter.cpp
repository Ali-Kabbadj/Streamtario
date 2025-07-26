#include "event_emitter.h"
#include "../../mainwindow/mainwindow.h"

namespace WebViewProtocol
{
namespace EventEmitter
{

    void emitPropertyChange(const std::string &property, const json &value)
    {
        PropertyChangeEventPayload p  = { property, value };
        json                       ev = { { "event", "property-change" }, { "payload", p } };
        SendMessageToJS(ev.dump());
    }

    void emitPlaybackEnded()
    {
        json ev = { { "event", "playback-ended" } };
        SendMessageToJS(ev.dump());
    }

}// namespace EventEmitter
}// namespace WebViewProtocol