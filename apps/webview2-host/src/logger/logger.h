#ifndef LOGGER_H
#define LOGGER_H

#include <string>
#include <fstream>
#include <sstream>
#include <windows.h>
#include <mpv/client.h>

enum class LogLevel
{
  INFO,
  WARN,
  WEBVIEW_ERROR,
  DEBUG,
  MPV
};

class Logger
{
public:
  static void Init(const std::wstring &log_dir);
  static void Cleanup();

  static void Log(LogLevel level,
                  const char *file,
                  const char *function,
                  const std::string &context,
                  const std::string &message);

  static void LogMpv(const mpv_event_log_message *msg);

private:
  static void Write(const std::string &full_log_message, bool is_mpv_log);
  static std::string FormatMessage(LogLevel level,
                                   const char *file,
                                   const char *function,
                                   const std::string &context,
                                   const std::string &message);

  static std::ofstream m_log_file;
  static std::ofstream m_mpv_log_file;
  static bool m_is_initialized;
};

#define LOG_INFO(context, message) Logger::Log(LogLevel::INFO, __FILE__, __func__, context, message)
#define LOG_WARN(context, message) Logger::Log(LogLevel::WARN, __FILE__, __func__, context, message)
#define LOG_ERROR(context, message) Logger::Log(LogLevel::WEBVIEW_ERROR, __FILE__, __func__, context, message)
#define LOG_DEBUG(context, message) Logger::Log(LogLevel::DEBUG, __FILE__, __func__, context, message)

#endif // LOGGER_H