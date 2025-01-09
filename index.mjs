import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();


const s3Client = new S3Client({ region: process.env.region , credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    sessionToken: process.env.SESSION_TOKEN
}});

const PREDEFINED_NAMES_1 = [
    '1_FRONT DRIVER’S SIDE',
    '2_FRONT CENTER',
    '3_FRONT PASSENGER’S SIDE',
    '4_PASSENGER SIDE',
    '5_REAR PASSENGER SIDE',
    '6_REAR CENTER',
    '7_REAR DRIVER’S SIDE',
    '8_DRIVER’S SIDE',
    '9_INTERIOR',
];

// space for non standard parts images
const PREDEFINED_NAMES_2 = [
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18'
]

const PREDEFINED_EXTENSIONS = ['png', 'jpg', 'jpeg'];

// replace bucket with whatever comes from secrets or "onegraph-collision-management-stage-us-east-1-bucket"
const BUCKET_NAME = process.env.BUCKET_NAME; 

async function generateUploadUrl(id) {
    if (!id) {
        throw new Error('ID is required');
    }


    try {
        const params = {
            Bucket: BUCKET_NAME,
            // update the key to include other supported names and other extensions as well
            Key: `${id}/`,
            ContentType: `image/png`
        };
        const command = new PutObjectCommand(params);
        const signedUrl = await getSignedUrl(s3Client, command, { 
            expiresIn: 3600
        });
        
        return {
            signedUrl,
            // allowedNames: PREDEFINED_NAMES_1
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
        if (!PREDEFINED_NAMES_1.includes(baseName) || !PREDEFINED_NAMES_1.includes(baseName) || !PREDEFINED_EXTENSIONS.includes(extension.slice(1))) {
            throw new Error(`Invalid filename. Must be one of: ${PREDEFINED_NAMES_1.join(', ')}`);
        }
        console.log('debug', baseName, extension);
        
        // Create the actual upload URL
        const fileKey = `${baseName}.${extension}`;
        // Instead of modifying the signed URL, just append the file key (filename + extension)
        const uploadUrl = signedUrl.split('?')[0] + fileKey + '?' + signedUrl.split('?')[1];
        
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
        console.log("Error uploading file", error);
        // console.error('Error:', error.message);
    }
};

// const { signedUrl } = await generateUploadUrl("123");
// console.log(signedUrl);


// console.log("signed url uploading...")
// const exampleSignedUrl = signedUrl; // update me as needed
// uploadExample(exampleSignedUrl, "1_FRONT DRIVER’S SIDE.png")


// this code sample below is for uploading directly through sdk code and it works with current permissions..
// async function uploadFile(filePath) {
//     const fileContent = await fs.readFile(filePath);
//     const command = new PutObjectCommand({
//         Bucket: BUCKET_NAME,
//         Body: fileContent,
//         Key: "1_FRONT DRIVER’S SIDE.png",
//         ContentType: 'image/png'
//     });

//     try {
//         const response = await s3Client.send(command);
//         console.log("Upload success:", response);
//     } catch (err) {
//         console.error("Upload error:", err);
//     }
// }

// uploadFile("./1_FRONT DRIVER’S SIDE.png");