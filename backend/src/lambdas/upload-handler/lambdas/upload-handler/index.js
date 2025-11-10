"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = require("crypto");
const auth_1 = require("../../middleware/auth");
const firebaseAdmin_1 = require("../../utils/firebaseAdmin");
// Initialize Firebase Admin SDK
(0, firebaseAdmin_1.initializeFirebaseAdmin)();
const s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
const ddbClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(ddbClient);
const BLUEPRINT_BUCKET = process.env.BLUEPRINT_BUCKET_NAME;
const RESULTS_BUCKET = process.env.RESULTS_BUCKET_NAME;
const JOBS_TABLE = process.env.JOBS_TABLE_NAME;
const handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    };
    try {
        // Verify authentication
        const authResult = await (0, auth_1.requireAuth)(event);
        if ('statusCode' in authResult) {
            return {
                statusCode: authResult.statusCode,
                headers,
                body: JSON.stringify({ error: authResult.message }),
            };
        }
        const user = authResult;
        // Parse request body
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Request body is required' }),
            };
        }
        const request = JSON.parse(event.body);
        // Validate request
        if (!request.fileName || !request.fileType) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'fileName and fileType are required' }),
            };
        }
        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
        if (!allowedTypes.includes(request.fileType)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
                }),
            };
        }
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (request.fileSize > maxSize) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'File size exceeds 10MB limit' }),
            };
        }
        // Generate unique job ID
        const jobId = (0, crypto_1.randomUUID)();
        const fileExtension = request.fileName.split('.').pop();
        const s3Key = `blueprints/${jobId}.${fileExtension}`;
        // Generate pre-signed URL for upload
        const command = new client_s3_1.PutObjectCommand({
            Bucket: BLUEPRINT_BUCKET,
            Key: s3Key,
            ContentType: request.fileType,
            Metadata: {
                jobId: jobId,
                originalFileName: request.fileName,
            },
        });
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 3600 });
        // Create job record in DynamoDB
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: JOBS_TABLE,
            Item: {
                jobId,
                userId: user.userId,
                fileName: request.fileName,
                fileType: request.fileType,
                fileSize: request.fileSize,
                status: 'pending',
                uploadedAt: Date.now(),
                s3Key,
            },
        }));
        // Prepare response
        const response = {
            jobId,
            uploadUrl,
            expiresIn: 3600,
        };
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('Error generating upload URL:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
