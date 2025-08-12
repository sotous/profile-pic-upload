const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;

const generateUniqueFileName = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');

exports.profilePicUpload = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { fileName, fileType } = body;

        if (!fileName || !fileType) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing fileName or fileType in the request body.' }),
            };
        }

        const uniqueFileName = generateUniqueFileName();
        const fileExtension = fileName.split('.').pop();
        const key = `${uniqueFileName}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 120 }); // URL expires in 2 minutes
        const { origin, pathname } = new URL(uploadUrl);
        const objectUrl = `${origin}${pathname}`; // stable object URL (may require read access)

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            },
            body: JSON.stringify({
                uploadUrl,
                key,
                objectUrl,
            }),
        };

    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error generating presigned URL.' }),
        };
    }
};

exports.corsHandler = async (event) => {
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ message: 'CORS preflight check successful.' }),
    };
};
