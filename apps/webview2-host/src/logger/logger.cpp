#include "logger.h"
#include <chrono>
#include <filesystem>
#include <iomanip>
#include <iostream>
#include <algorithm>

std::ofstream Logger::m_log_file;
std::ofstream Logger::m_mpv_log_file;
bool Logger::m_is_initialized = false;

void Logger::Init(const std::wstring &log_dir_w)
{
    if (m_is_initialized)
        return;

#ifndef _DEBUG
    try
    {
        std::filesystem::path log_dir(log_dir_w);
        if (!std::filesystem::exists(log_dir))
        {
            std::filesystem::create_directories(log_dir);
        }
        m_log_file.open(log_dir / "WEBVIEW.log", std::ios::out | std::ios::app);
        m_mpv_log_file.open(log_dir / "mpv.log", std::ios::out | std::ios::app);
    }
    catch (const std::filesystem::filesystem_error &e)
    {
        OutputDebugStringA(("Logger Init Failed: " + std::string(e.what()) + "\n").c_str());
    }
#endif
    m_is_initialized = true;
    LOG_INFO("Logger", "Logger initialized successfully.");
}

void Logger::Cleanup()
{
    if (m_log_file.is_open())
    {
        m_log_file.close();
    }
    if (m_mpv_log_file.is_open())
    {
        m_mpv_log_file.close();
    }
    m_is_initialized = false;
}

std::string Logger::FormatMessage(LogLevel level,
                                  const char *file,
                                  const char *function,
                                  const std::string &context,
                                  const std::string &message)
{
    auto now = std::chrono::system_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::tm bt = {};
    localtime_s(&bt, &in_time_t);

    std::stringstream ss;
    ss << std::put_time(&bt, "%M:%S");
    ss << '.' << std::setw(3) << std::setfill('0') << ms.count();
    std::string timestamp = ss.str();

    std::string emoji;
    switch (level)
    {
    case LogLevel::INFO:
        emoji = "✅";
        break;
    case LogLevel::WARN:
        emoji = "⚠️";
        break;
    case LogLevel::WEBVIEW_ERROR:
        emoji = "❌";
        break;
    case LogLevel::DEBUG:
        emoji = "🐞";
        break;
    case LogLevel::MPV:
        emoji = "🎬";
        break;
    }

    std::string app_name = "WEBVIEW";
    std::string file_str = std::filesystem::path(file).filename().string();
    if (level == LogLevel::MPV)
    {
        file_str = "mpv";
    }

    std::stringstream log_stream;
    log_stream << "[" << timestamp << "]"
               << "[" << emoji << "]"
               << "[" << app_name << "]"
               << "[" << file_str << "]"
               << "[" << context << "]"
               << "[" << function << "] " << message << "\n";

    return log_stream.str();
}

void Logger::Write(const std::string &full_log_message, bool is_mpv_log)
{
#ifdef _DEBUG
    if (full_log_message.empty())
        return;
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, &full_log_message[0], (int)full_log_message.size(), NULL, 0);
    if (size_needed > 0)
    {
        std::wstring wstr(size_needed, 0);
        MultiByteToWideChar(CP_UTF8, 0, &full_log_message[0], (int)full_log_message.size(), &wstr[0], size_needed);
        OutputDebugStringW(wstr.c_str());
    }
#else
    if (is_mpv_log)
    {
        if (m_mpv_log_file.is_open())
        {
            m_mpv_log_file << full_log_message;
        }
    }
    else
    {
        if (m_log_file.is_open())
        {
            m_log_file << full_log_message;
        }
    }
#endif
}

void Logger::Log(LogLevel level,
                 const char *file,
                 const char *function,
                 const std::string &context,
                 const std::string &message)
{
    if (!m_is_initialized && level != LogLevel::INFO)
    {
        return;
    }
    std::string formatted = FormatMessage(level, file, function, context, message);
    Write(formatted, false);
}

void Logger::LogMpv(const mpv_event_log_message *msg)
{
    if (!m_is_initialized)
        return;

    std::string context = msg->prefix;
    std::string message = msg->text;
    if (!message.empty() && message.back() == '\n')
    {
        message.pop_back();
    }

    std::string formatted = FormatMessage(LogLevel::MPV, "mpv", context.c_str(), msg->level, message);
    Write(formatted, true);
}