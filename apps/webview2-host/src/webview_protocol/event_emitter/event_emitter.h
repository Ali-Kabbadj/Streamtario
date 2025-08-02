#ifndef EVENT_EMITTER_H
#define EVENT_EMITTER_H

#include <string>
#include "../types.h"

namespace WebViewProtocol
{
    namespace EventEmitter
    {
        void emitPropertyChange(const std::string &property, const json &value);
        void emitPlaybackEnded();
    } // namespace EventEmitter
} // namespace WebViewProtocol

#endif // EVENT_EMITTER_H