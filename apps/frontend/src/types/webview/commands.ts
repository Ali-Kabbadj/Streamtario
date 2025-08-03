
interface PlayCommand {
    command: "play";
    payload: {
        url: string;
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

export type WebViewCommand =
    | PlayCommand
    | StopCommand
    | TogglePauseCommand
    | SeekCommand
    | SetVolumeCommand
    | ToggleMuteCommand
    | ToggleFullscreenCommand