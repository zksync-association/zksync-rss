import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const keyFilePath = process.env.GOOGLE_KEY ? path.resolve(__dirname, process.env.GOOGLE_KEY) : '';

const storage = new Storage({
  keyFilename: keyFilePath,
});

export const uploadToGCS = async (
  bucketName: string,
  filePath: string,
  destinationPath: string,
  content?: string
): Promise<void> => {
  try {
    const bucket = storage.bucket(bucketName);

    // If content is provided and file doesn't exist, create it
    if (content && !fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content);
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    // Upload file with no-cache settings
    await bucket.upload(filePath, {
      destination: destinationPath,
      metadata: {
        contentType: path.extname(filePath) === '.xml' ? 'application/xml' : 'application/json',
        cacheControl: 'no-cache, no-store, must-revalidate', // Prevent caching
        pragma: 'no-cache',  // HTTP 1.0 compatibility
        expires: '0'         // Immediate expiration
      }
    });

    // Make the file publicly accessible with no-cache headers
    const file = bucket.file(destinationPath);
    await file.makePublic();

    // Update the metadata separately to ensure it's set
    await file.setMetadata({
      cacheControl: 'no-cache, no-store, must-revalidate',
      pragma: 'no-cache',
      expires: '0'
    });

    console.log(`Successfully uploaded ${filePath} to ${bucketName}/${destinationPath} with no-cache settings`);
  } catch (error) {
    console.error('Error uploading file to GCS:', error);
    throw error;
  }
};

export const downloadFromGCS = async (
  bucketName: string,
  sourcePath: string,
  destinationPath: string
): Promise<void> => {
  try {
    console.log(`Attempting to download from bucket: ${bucketName}, source: ${sourcePath}, destination: ${destinationPath}`);

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(sourcePath);

    // Ensure the destination directory exists
    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }

    // Download file
    await file.download({
      destination: destinationPath
    });

    console.log(`Successfully downloaded ${sourcePath} from ${bucketName} to ${destinationPath}`);
  } catch (error) {
    console.error('Error downloading file from GCS:', error);
    throw error;
  }
};
