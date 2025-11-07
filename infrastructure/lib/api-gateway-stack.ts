import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApiGatewayStackProps extends cdk.StackProps {
  environmentName: string;
  uploadLambda: lambda.IFunction;
  statusLambda: lambda.IFunction;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly httpApi: apigateway.HttpApi;

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    // HTTP API (cheaper and simpler than REST API for this use case)
    this.httpApi = new apigateway.HttpApi(this, 'LocationDetectionApi', {
      apiName: `location-detection-api-${props.environmentName}`,
      description: 'API for Location Detection AI blueprint processing',
      corsPreflight: {
        allowOrigins: ['*'], // Update with actual frontend URL in production
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Upload endpoint integration
    const uploadIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'UploadIntegration',
      props.uploadLambda
    );

    this.httpApi.addRoutes({
      path: '/upload',
      methods: [apigateway.HttpMethod.POST],
      integration: uploadIntegration,
    });

    // Status check endpoint integration
    const statusIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'StatusIntegration',
      props.statusLambda
    );

    this.httpApi.addRoutes({
      path: '/status/{jobId}',
      methods: [apigateway.HttpMethod.GET],
      integration: statusIntegration,
    });

    // Access logs
    const logGroup = new logs.LogGroup(this, 'ApiLogs', {
      logGroupName: `/aws/apigateway/location-detection-${props.environmentName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Default stage with logging
    const stage = this.httpApi.defaultStage as apigateway.HttpStage;
    stage.node.addDependency(logGroup);

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.httpApi.apiEndpoint,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'UploadUrl', {
      value: `${this.httpApi.apiEndpoint}/upload`,
      description: 'Blueprint upload endpoint',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'LocationDetectionAI');
    cdk.Tags.of(this).add('Environment', props.environmentName);
  }
}
