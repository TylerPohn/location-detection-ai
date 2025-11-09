import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DynamoDBStackProps extends cdk.StackProps {
  environmentName: string;
}

/**
 * DynamoDB Stack for Location Detection AI
 *
 * Creates tables for user management, invites, and job tracking:
 * - Users: Store user profile and role information
 * - Invites: Manage invite codes for user registration
 * - Jobs: Track blueprint processing jobs per user
 */
export class DynamoDBStack extends cdk.Stack {
  public readonly usersTable: dynamodb.Table;
  public readonly invitesTable: dynamodb.Table;
  public readonly jobsTable: dynamodb.Table;
  public readonly rateLimitsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDBStackProps) {
    super(scope, id, props);

    // Users table - stores authenticated user information
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `location-detection-users-${props.environmentName}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for email lookups
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Invites table - manages invitation codes
    this.invitesTable = new dynamodb.Table(this, 'InvitesTable', {
      tableName: `location-detection-invites-${props.environmentName}`,
      partitionKey: { name: 'inviteId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt',
    });

    // Add GSI for email lookups on invites
    this.invitesTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add GSI for status queries
    this.invitesTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Jobs table - tracks blueprint processing jobs
    this.jobsTable = new dynamodb.Table(this, 'JobsTable', {
      tableName: `location-detection-jobs-${props.environmentName}`,
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for userId queries (get all jobs for a user)
    this.jobsTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadedAt', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Outputs
    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'Users table name',
    });

    new cdk.CfnOutput(this, 'InvitesTableName', {
      value: this.invitesTable.tableName,
      description: 'Invites table name',
    });

    new cdk.CfnOutput(this, 'JobsTableName', {
      value: this.jobsTable.tableName,
      description: 'Jobs table name',
    });

    // Rate limits table - tracks upload counts per user per day
    this.rateLimitsTable = new dynamodb.Table(this, 'RateLimitsTable', {
      tableName: `location-detection-rate-limits-${props.environmentName}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
    });

    new cdk.CfnOutput(this, 'RateLimitsTableName', {
      value: this.rateLimitsTable.tableName,
      description: 'Rate limits table name',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'LocationDetectionAI');
    cdk.Tags.of(this).add('Environment', props.environmentName);
  }
}
