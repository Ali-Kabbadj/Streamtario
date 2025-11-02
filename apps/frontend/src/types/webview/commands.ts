interface PlayCommand {
    command: "play";
    payload: {
        url: string;
        startTime: number;
    };
}

interface StopCommand {
    command: "stop";
}

interface TogglePauseCommand {
    command: "toggle-pause";
}

interface SeekCommand {
    command: "seek";
    payload: {
        time: number;
    };
}

interface SetVolumeCommand {
    command: "set-volume";
    payload: {
        volume: number;
    };
}

interface ToggleMuteCommand {
    command: "toggle-mute";
}

interface ToggleFullscreenCommand {
    command: "toggle-fullscreen";
}

interface SetPropertyCommand {
    command: "set-property";
    payload: {
        property: "aid" | "sid" | "pause";
        value: string;
    };
}

interface LoadSubtitleCommand {
    command: "load-subtitle";
    payload: {
        url: string;
    };
}

interface RawCommand {
    command: "raw";
    payload: {
        command_string: string;
    };
}

export type WebViewCommand =
    | PlayCommand
    | StopCommand
    | TogglePauseCommand
    | SeekCommand
    | SetVolumeCommand
    | ToggleMuteCommand
    | ToggleFullscreenCommand
    | SetPropertyCommand
    | LoadSubtitleCommand
    | RawCommand;