cmake_minimum_required(VERSION 3.16)

project(Streamtario VERSION "1.0.0")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
option(DEBUG_LOG "Allow debug logs" ON)

# ---- VCPKG Toolchain check ----
if(NOT DEFINED CMAKE_TOOLCHAIN_FILE AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake")
    set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake" CACHE STRING "VCPKG toolchain file")
endif()

# ---- MPV Setup ----
set(MPV_ARCH "x86_64") # or "i686" for 32-bit
set(MPV_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/deps/libmpv/${MPV_ARCH}/include")
set(MPV_LIBRARY "${CMAKE_CURRENT_SOURCE_DIR}/deps/libmpv/${MPV_ARCH}/mpv.lib")
set(MPV_DLL "${CMAKE_CURRENT_SOURCE_DIR}/deps/libmpv/${MPV_ARCH}/libmpv-2.dll")

# Check that the MPV files actually exist
if(NOT EXISTS "${MPV_INCLUDE_DIR}/mpv/client.h")
    message(FATAL_ERROR "MPV header not found at ${MPV_INCLUDE_DIR}/mpv/client.h")
endif()
if(NOT EXISTS "${MPV_LIBRARY}")
    message(FATAL_ERROR "MPV library not found at ${MPV_LIBRARY}")
endif()
if(NOT EXISTS "${MPV_DLL}")
    message(FATAL_ERROR "MPV DLL not found at ${MPV_DLL}. Please download it and place it in the deps folder.")
endif()

include_directories(${MPV_INCLUDE_DIR})

# ---- Dependencies from vcpkg ----
find_package(nlohmann_json CONFIG REQUIRED)
find_package(unofficial-webview2 CONFIG REQUIRED) 
find_package(wil CONFIG REQUIRED)

# ---- Source Files ----
set(SOURCES
    src/main.cpp
    src/config/config.cpp
    src/globals/globals.cpp
    src/helpers/helpers.cpp
    src/logger/logger.cpp
    src/mainwindow/mainwindow.cpp
    src/mpv/mpv.cpp
    src/webview/webview.cpp
    src/webview_protocol/command_handler/command_handler.cpp
    src/webview_protocol/event_emitter/event_emitter.cpp
    src/resources/resource.rc
)

add_executable(${PROJECT_NAME} WIN32 ${SOURCES})


# ---- Unicode support ----
target_compile_definitions(${PROJECT_NAME} PRIVATE UNICODE _UNICODE)


# ---- Include Directories ----
target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)

# ---- Link dependencies ----
target_link_libraries(${PROJECT_NAME} PRIVATE
    gdiplus.lib
    dwmapi.lib
    shcore.lib
    nlohmann_json::nlohmann_json
    unofficial::webview2::webview2 
    WIL::WIL
    ${MPV_LIBRARY}
    Pathcch
)

if(DEBUG_LOG)
    target_compile_definitions(${PROJECT_NAME} PRIVATE DEBUG_LOG)
endif()

# ---- Copy MPV DLL to output ----
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "${MPV_DLL}"
    $<TARGET_FILE_DIR:${PROJECT_NAME}>
    COMMENT "Copying MPV DLL to output directory..."
)