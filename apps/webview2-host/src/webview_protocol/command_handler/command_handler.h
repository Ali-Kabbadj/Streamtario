#ifndef COMMAND_HANDLER_H
#define COMMAND_HANDLER_H

#include <string>
#include <functional>
#include <map>
#include "../types.h"

namespace WebViewProtocol
{

class CommandHandler
{
  public:
    CommandHandler();
    void handleCommand(const std::wstring &message);

  private:
    using CommandFunction = std::function<void(const json &)>;
    std::map<std::string, CommandFunction> m_commands;
};

}// namespace WebViewProtocol

#endif// COMMAND_HANDLER_H