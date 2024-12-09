import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs/promises';
import path from 'path';

const s3Client = new S3Client({ region: "us-east-1" });

async function uploadFile(fileContent, fileName) {
    const params = {
        Bucket: "test-collision-photo-bucket",
        Key: fileName,
        Body: fileContent
    };
    try {
        const data = await s3Client.send(new PutObjectCommand(params));
        console.log("File uploaded successfully", data);
        return data;
    } catch (err) {
        console.error("Error", err);
        throw err;
    }
}

async function downloadFile(fileName) {
    const params = {
        Bucket: "test-collision-photo-bucket",
        Key: fileName
    };
    try {
        const data = await s3Client.send(new GetObjectCommand(params));
        console.log("File downloaded successfully");
        return data;
    } catch (err) {
        console.error("Error", err);
        throw err;
    }
}

// Example usage
async function main() {
    try {
        // Upload a text file
        const textContent = "Hello, this is a test file content";
        await uploadFile(textContent, "test.txt");

        // Upload an image file
        const imageBuffer = await fs.readFile(path.join(process.cwd(), 'test-picture.png'));
        await uploadFile(imageBuffer, "test-picture.png");

        // Download and verify the text file
        const downloadedText = await downloadFile("test.txt");
        console.log("Downloaded text:", await downloadedText.Body.transformToString());

    } catch (error) {
        console.error("Error in main:", error);
    }
}

// Run the example
main();