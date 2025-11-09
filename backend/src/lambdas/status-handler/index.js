"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
const BLUEPRINT_BUCKET = process.env.BLUEPRINT_BUCKET_NAME;
const RESULTS_BUCKET = process.env.RESULTS_BUCKET_NAME;
const handler = async (event) => {
    try {
        const jobId = event.pathParameters?.jobId;
        if (!jobId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'jobId is required' }),
            };
        }
        // Check if blueprint exists
        let blueprintExists = false;
        try {
            const fileExtensions = ['png', 'jpg', 'jpeg', 'pdf'];
            for (const ext of fileExtensions) {
                try {
                    await s3Client.send(new client_s3_1.HeadObjectCommand({
                        Bucket: BLUEPRINT_BUCKET,
                        Key: `blueprints/${jobId}.${ext}`,
                    }));
                    blueprintExists = true;
                    break;
                }
                catch (e) {
                    // Try next extension
                }
            }
        }
        catch (error) {
            // Blueprint not found
        }
        if (!blueprintExists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Job not found' }),
            };
        }
        // Check if results exist
        const resultsKey = `results/${jobId}.json`;
        let status = 'processing';
        let result;
        try {
            const resultObject = await s3Client.send(new client_s3_1.GetObjectCommand({
                Bucket: RESULTS_BUCKET,
                Key: resultsKey,
            }));
            const resultBody = await resultObject.Body?.transformToString();
            if (resultBody) {
                result = JSON.parse(resultBody);
                status = 'completed';
            }
        }
        catch (error) {
            // Results not ready yet
            status = 'processing';
        }
        // Flatten the result and transform to match frontend expectations
        const response = {
            jobId,
            status,
            ...(result && {
                roomCount: result.room_count,
                rooms: result.rooms?.map((room) => ({
                    id: room.id.toString(),
                    polygon: room.vertices?.map((v) => [v.x, v.y]) || [],
                    area: room.area || 0,
                    perimeter: 0, // Calculate if needed
                    lines: [], // Calculate if needed
                    bounding_box: room.bounding_box,
                    confidence: room.confidence,
                })),
                imageShape: result.image_shape,
                timestamp: result.timestamp,
            }),
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('Error checking status:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
