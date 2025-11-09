#!/usr/bin/env node
/**
 * Admin Bootstrap Script
 *
 * Creates the first admin user in DynamoDB Users table.
 *
 * Usage:
 *   npm run create-admin <email>
 *
 * Example:
 *   npm run create-admin admin@example.com
 *
 * Prerequisites:
 *   - AWS credentials configured
 *   - DynamoDB Users table deployed
 *   - AWS_REGION environment variable set
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME || 'LocationDetection-Users-development';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface AdminUser {
  userId: string;
  email: string;
  role: 'admin';
  status: 'active';
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Validates email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Creates an admin user in DynamoDB
 */
async function createAdminUser(email: string): Promise<void> {
  console.log(`\n🔐 Creating admin user for: ${email}\n`);

  // Validate email
  if (!validateEmail(email)) {
    throw new Error(`Invalid email format: ${email}`);
  }

  // Check if user already exists
  const getCommand = new GetCommand({
    TableName: USERS_TABLE_NAME,
    Key: { email },
  });

  try {
    const existingUser = await docClient.send(getCommand);
    if (existingUser.Item) {
      console.log(`⚠️  User already exists with email: ${email}`);
      console.log(`   Current role: ${existingUser.Item.role}`);
      console.log(`   Status: ${existingUser.Item.status}`);

      if (existingUser.Item.role === 'admin') {
        console.log('\n✅ User is already an admin. No changes needed.\n');
        return;
      } else {
        console.log('\n❌ User exists but is not an admin. Please manually update the role in DynamoDB.\n');
        return;
      }
    }
  } catch (error) {
    console.error('Error checking existing user:', error);
    throw error;
  }

  // Create new admin user
  const adminUser: AdminUser = {
    userId: randomUUID(),
    email: email.toLowerCase(),
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const putCommand = new PutCommand({
    TableName: USERS_TABLE_NAME,
    Item: adminUser,
    ConditionExpression: 'attribute_not_exists(email)', // Ensure no duplicate
  });

  try {
    await docClient.send(putCommand);
    console.log('✅ Admin user created successfully!\n');
    console.log('User Details:');
    console.log(`  User ID: ${adminUser.userId}`);
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Role: ${adminUser.role}`);
    console.log(`  Status: ${adminUser.status}`);
    console.log(`  Created: ${adminUser.createdAt}`);
    console.log('\n📧 The user can now sign in with Google using this email address.\n');
  } catch (error: any) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.error('\n❌ User already exists (race condition detected).\n');
    } else {
      console.error('\n❌ Failed to create admin user:', error.message);
      throw error;
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error(`
❌ Error: Email address is required

Usage:
  npm run create-admin <email>

Example:
  npm run create-admin admin@example.com

Environment Variables:
  USERS_TABLE_NAME - DynamoDB Users table name (default: LocationDetection-Users-development)
  AWS_REGION - AWS region (default: us-east-1)
    `);
    process.exit(1);
  }

  try {
    console.log('\n🚀 Admin Bootstrap Script');
    console.log('========================\n');
    console.log(`Configuration:`);
    console.log(`  Table: ${USERS_TABLE_NAME}`);
    console.log(`  Region: ${AWS_REGION}`);

    await createAdminUser(email);

    console.log('✅ Bootstrap complete!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Bootstrap failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure AWS credentials are configured');
    console.error('  2. Verify the DynamoDB table exists');
    console.error('  3. Check IAM permissions for DynamoDB PutItem/GetItem');
    console.error('  4. Confirm AWS_REGION is correct\n');
    process.exit(1);
  }
}

main();
