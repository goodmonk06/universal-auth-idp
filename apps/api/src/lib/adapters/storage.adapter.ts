export interface UploadedFile {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export interface IStorageAdapter {
  uploadFile(file: Buffer, filename: string, mimeType: string): Promise<UploadedFile>;
  deleteFile(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

// In-memory implementation for development (not for production!)
export class InMemoryStorageAdapter implements IStorageAdapter {
  private storage: Map<string, Buffer> = new Map();

  async uploadFile(file: Buffer, filename: string, mimeType: string): Promise<UploadedFile> {
    const key = `${Date.now()}-${filename}`;
    this.storage.set(key, file);

    console.log('[Storage] File uploaded:', { key, size: file.length, mimeType });

    return {
      url: `/files/${key}`,
      key,
      size: file.length,
      mimeType,
    };
  }

  async deleteFile(key: string): Promise<void> {
    this.storage.delete(key);
    console.log('[Storage] File deleted:', { key });
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    return `/files/${key}?expires=${Date.now() + expiresIn * 1000}`;
  }
}
