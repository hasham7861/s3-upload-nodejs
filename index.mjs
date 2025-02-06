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
}});

const collisionImagesNames = [
    'driverSide',
    'frontCenter',
    'frontDriverSide',
    'frontPassengerSide',
    'interior',
    'passengerSide',
    'rearCenter',
    'rearDriverSide',
    'rearPassengerSide',
];

// space for non standard parts images
const collisionOtherImagesNames = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9'
]

const PREDEFINED_EXTENSIONS = ['png', 'jpg', 'jpeg'];

// replace bucket with whatever comes from secrets or "onegraph-collision-management-stage-us-east-1-bucket"
const BUCKET_NAME = process.env.BUCKET_NAME; 


// TODO: create a loop to generate 18 signed urls for uploading files to s3
async function generateSignedUrls(vin, collisionId, subFolderName, fileNames) {
  const signedUrls = {};

  // Generate signed URL for the main directory
  const directoryKey =`${vin}_${collisionId}/${subFolderName}/`;
  const directoryParams = {
      Bucket: BUCKET_NAME,
      Key: directoryKey,  // Specify the directory key
      ContentType: 'image/*' // Allow any image type
  };

  const directoryCommand = new PutObjectCommand(directoryParams);
  const directorySignedUrl = await getSignedUrl(s3Client, directoryCommand, { 
      expiresIn: 3600 // Set expiration time
  });

  for (const fileName of fileNames) {
      const fileParams = {
          Bucket: BUCKET_NAME,
          Key: `${directoryKey}${fileName}/${fileName}.image`,  // this is how the signed urls are constructed on rasp side
        //   ContentType: 'image/*' // Specify the content type for PNG
      };

      const fileCommand = new PutObjectCommand(fileParams);
      const fileSignedUrl = await getSignedUrl(s3Client, fileCommand, { 
          expiresIn: 3600 // Set expiration time
      });

      signedUrls[fileName] = fileSignedUrl; // Store the signed URL for each file
  }

  return signedUrls; // Return all signed URLs
}



const uploadExample = async (signedUrl, filePath) => {
    try {
        const fileContent = await fs.readFile(filePath);
        const baseName = path.basename(filePath);
        const extension = path.extname(filePath);
        
        const encodedFilename = encodeURIComponent(baseName);
        // Construct the full URL by appending the filename to the base URL
        // The key part is to handle the URL construction correctly
        const baseUrlParts = signedUrl.split('?');
        const uploadUrl = `${baseUrlParts[0]}${encodedFilename}?${baseUrlParts[1]}`;
        console.log('modified signedUrl', uploadUrl);

        const response = await fetch(signedUrl, {
            method: 'PUT',
            body: fileContent,
            headers: {
                'Content-Type': `image/png`
            }
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        console.log(`Successfully uploaded ${baseName}`);
    } catch (error) {
        console.log("Error uploading file", error);
    }
};

let vin = "vin1234", collision="collision345"
const collisionImagesSignedUrls = await generateSignedUrls(vin, collision, "collisionImages", collisionImagesNames);
const collisionOtherImagesSignedUrls = await generateSignedUrls(vin, collision, "collisionOtherImages", collisionOtherImagesNames);
const finalPayloadOfSignedUrls = {
  preSignedUrls: {
    collisionImages: collisionImagesSignedUrls,
    collisionOtherImages: collisionOtherImagesSignedUrls
  }
}

console.log("signedUrls", {
  preSignedUrls: finalPayloadOfSignedUrls,
});


// console.log("signed url uploading...")
const exampleSignedUrl = finalPayloadOfSignedUrls['preSignedUrls']['collisionImages']['frontDriverSide']; // update me as needed
uploadExample(exampleSignedUrl, "1.png")


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