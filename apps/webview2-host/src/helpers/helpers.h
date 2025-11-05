#ifndef HELPERS_H
#define HELPERS_H

#include <string>
#include <wrl.h>

std::string wstring_to_string(const std::wstring &wstr);
std::wstring string_to_wstring(const std::string &str);

#endif