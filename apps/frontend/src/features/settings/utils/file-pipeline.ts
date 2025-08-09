// utils/file-pipeline.ts

export interface FileUploadPayload {
    filename: string;
    mime: string;
    size: number;
    dataUri: string;
}

export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to read file as Data URL.'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export async function prepareUploadPayload(file: File): Promise<FileUploadPayload> {
    const dataUri = await fileToBase64(file);
    return {
        filename: file.name,
        mime: file.type,
        size: file.size,
        dataUri,
    };
}