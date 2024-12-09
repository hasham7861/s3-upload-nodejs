import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';  // Make sure to import node-fetch

const s3Client = new S3Client({ region: "us-east-1" });

const PREDEFINED_NAMES = [
    'front',
    'back',
    'left',
    'right',
    'interior'
];

async function generateUploadUrl(id) {
    if (!id) {
        throw new Error('ID is required');
    }
    try {
        const params = {
            Bucket: "test-collision-photo-bucket",
            Key: `${id}/{filename}.*`,
            ContentType: '*/*'
        };
        const command = new PutObjectCommand(params);
        const signedUrl = await getSignedUrl(s3Client, command, { 
            expiresIn: 3600
        });
        
        return {
            signedUrl,
            allowedNames: PREDEFINED_NAMES
        };
    } catch (err) {
        console.error("Error generating signed URL", err);
        throw err;
    }
}

const uploadExample = async (signedUrl, filePath) => {
    try {
        // Read the file
        const fileContent = await fs.readFile(filePath);
        
        // Get the filename without extension
        const baseName = path.basename(filePath, path.extname(filePath));
        const extension = path.extname(filePath);
        
        // Check if the base name is allowed
        if (!PREDEFINED_NAMES.includes(baseName)) {
            throw new Error(`Invalid filename. Must be one of: ${PREDEFINED_NAMES.join(', ')}`);
        }
        
        // Create the actual upload URL
        const uploadUrl = signedUrl.replace('%7Bfilename%7D.%2A', `${baseName}${extension}`);
        
        // Upload the file
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: fileContent,
            headers: {
                'Content-Type': `image/${extension.slice(1)}`  // removes the dot from extension
            }
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        console.log(`Successfully uploaded ${baseName}${extension}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
};

// const { signedUrl } = await generateUploadUrl("123");
// console.log(signedUrl);


// console.log("signed url upload")
const exampleSignedUrl = ""; // update me as needed
uploadExample(exampleSignedUrl, "front.png")