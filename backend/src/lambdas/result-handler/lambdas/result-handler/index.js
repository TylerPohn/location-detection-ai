"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const firebaseAdmin_1 = require("../../utils/firebaseAdmin");
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
(0, firebaseAdmin_1.initializeFirebaseAdmin)();
const handler = async (event) => {
    console.log('S3 result event received:', JSON.stringify(event, null, 2));
    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = record.s3.object.key;
        console.log(`Processing result file: s3://${bucket}/${key}`);
        // Extract jobId from key: results/{jobId}.json
        const match = key.match(/results\/([^\/]+)\.json$/);
        if (!match) {
            console.log(`Skipping non-result file: ${key}`);
            continue;
        }
        const jobId = match[1];
        console.log(`Updating Firestore status for job: ${jobId}`);
        try {
            // Update job status in Firestore
            await admin
                .firestore()
                .collection('jobs')
                .doc(jobId)
                .update({
                status: 'completed',
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                resultUrl: `s3://${bucket}/${key}`,
            });
            console.log(`✅ Successfully updated job ${jobId} to completed`);
        }
        catch (error) {
            console.error(`❌ Failed to update job ${jobId}:`, error);
            throw error;
        }
    }
};
exports.handler = handler;
