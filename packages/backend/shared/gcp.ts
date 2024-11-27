import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Google Cloud Storage
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
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Write the content to file
      fs.writeFileSync(filePath, content);
    }

    // Check if file exists after potential creation
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    // Upload file
    await bucket.upload(filePath, {
      destination: destinationPath,
      metadata: {
        contentType: path.extname(filePath) === '.xml' ? 'application/xml' : 'application/json'
      }
    });

    console.log(`Successfully uploaded ${filePath} to ${bucketName}/${destinationPath}`);
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