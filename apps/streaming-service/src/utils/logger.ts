import winston from 'winston';
import Transport from 'winston-transport';
import path from 'path';
import { config } from '../config.js';

const isProduction = config.IS_PRODUCTION;

const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        stream: 4,
        ws: 5,
        db: 6,
        init: 7,
        debug: 8,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        stream: 'cyan',
        ws: 'blue',
        db: 'gray',
        init: 'white',
        debug: 'green',
    },
};

const emojiMap: Record<string, string> = {
    info: '✅',
    warn: '⚠️',
    error: '❌',
    debug: '🐞',
    init: '🚀',
    stream: '🎬',
    ws: '🔌',
    db: '💾',
    http: '🌐',
};

winston.addColors(customLevels.colors);

const buildLogPrefix = (info: winston.Logform.TransformableInfo): string => {
    const cleanLevel = info.level.replace(/\u001b\[\d+m/g, '');
    const emoji = emojiMap[cleanLevel] || '💬';
    const appName = 'STREAMING_API';

    const timestamp = new Date().toLocaleTimeString('en-US', {
        hour12: false, minute: '2-digit', second: '2-digit'
    }) + `.${new Date().getMilliseconds().toString().padStart(3, '0')}`;

    let logMessage = `[${timestamp}][${emoji}][${appName}]`;

    if (info.file && typeof info.file === 'string') {
        logMessage += `[${path.basename(info.file)}]`;
    }
    if (info.context) logMessage += `[${info.context}]`;
    if (info.func) logMessage += `[${info.func}]`;

    return logMessage;
};

class VscodeDebugTransport extends Transport {
    log(info: winston.Logform.TransformableInfo, callback: () => void) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        const prefix = buildLogPrefix(info);
        const { message, data, error } = info;
        const extraData = data || error;
        console.log(`${prefix} ${message as string}`);

        if (extraData && typeof extraData === 'object' && Object.keys(extraData).length > 0) {
            for (const key in extraData) {
                if (Object.prototype.hasOwnProperty.call(extraData, key)) {
                    console.log(`${prefix}  ${key}:`, extraData[key]);
                }
            }
        } else if (extraData) {
            console.log(`${prefix}  Data:`, extraData);
        }

        if (callback) {
            callback();
        }
    }
}


const transports: winston.transport[] = [];

if (isProduction) {
    const productionFormat = winston.format.combine(
        winston.format.splat(),
        winston.format.printf((info) => {
            const prefix = buildLogPrefix(info);
            let logMessage = `${prefix} ${info.message}`;
            const extraData = info.data || info.error;
            if (extraData) {
                logMessage += `, ${JSON.stringify(extraData, null, 0)}`;
            }
            return logMessage;
        })
    );

    transports.push(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize({ all: true }), productionFormat)
    }));

    transports.push(new winston.transports.File({
        filename: path.join(config.PROJECT_ROOT, 'logs', 'STREAMING_API.log'),
        format: winston.format.combine(winston.format.uncolorize(), productionFormat),
    }));

} else {
    transports.push(new VscodeDebugTransport({
        format: winston.format.combine(
            winston.format.splat(),
            winston.format.colorize({ all: true })
        ),
    }));
}


const logger = winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    levels: customLevels.levels,
    transports: transports,
});


interface LogMeta {
    func?: string;
    context?: string;
    data?: any;
    error?: any;
}

const buildLogger = (file: string) => {
    const fileMeta = { file };
    return {
        info: (message: string, meta?: LogMeta) => logger.info(message, { ...fileMeta, ...meta }),
        warn: (message: string, meta?: LogMeta) => logger.warn(message, { ...fileMeta, ...meta }),
        error: (message: string, meta?: LogMeta) => (logger as any).error(message, { ...fileMeta, ...meta }),
        debug: (message: string, meta?: LogMeta) => (logger as any).debug(message, { ...fileMeta, ...meta }),
        init: (message: string, meta?: LogMeta) => (logger as any).init(message, { ...fileMeta, ...meta }),
        stream: (message: string, meta?: LogMeta) => (logger as any).stream(message, { ...fileMeta, ...meta }),
        ws: (message: string, meta?: LogMeta) => (logger as any).ws(message, { ...fileMeta, ...meta }),
        db: (message: string, meta?: LogMeta) => (logger as any).db(message, { ...fileMeta, ...meta }),
        http: (message: string, meta?: LogMeta) => (logger as any).http(message, { ...fileMeta, ...meta }),
    };
};

export { logger, buildLogger };