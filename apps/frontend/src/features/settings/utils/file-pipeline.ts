// utils/file-pipeline.ts
/**
 * Front-end pipeline helpers to prepare uploaded files for storage.
 * Right now: read File -> produce an object containing
 *  - filename
 *  - size
 *  - mime
 *  - base64 (for sending to server)
 *  - parsed (if mpv.conf will be parsed by client)
 *
 * This is a client-side helper; server side will accept this payload and store it.
 */

export async function fileToBase64(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
            const result = r.result as string;
            // r.result is like "data:<mime>;base64,xxxxx"
            // return tail part with header, or full data URI depending on server
            resolve(result);
        };
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

export async function prepareUploadPayload(file: File) {
    const dataUri = await fileToBase64(file);
    return {
        filename: file.name,
        mime: file.type,
        size: file.size,
        dataUri,
    };
}
