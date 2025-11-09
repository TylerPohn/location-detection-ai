# Location Detection AI - Troubleshooting Guide

## Table of Contents
- [Common Issues](#common-issues)
- [Frontend Issues](#frontend-issues)
- [Backend Issues](#backend-issues)
- [Deployment Issues](#deployment-issues)
- [Performance Issues](#performance-issues)
- [Error Messages](#error-messages)
- [Debugging Tools](#debugging-tools)

## Common Issues

### Issue: File Upload Fails

**Symptoms**:
- Upload progress bar stalls at 0%
- "Network Error" message
- CORS errors in browser console

**Solutions**:

1. **Check File Size**:
   ```bash
   # Verify file size
   ls -lh floor-plan.png
   # Must be < 10MB
   ```

2. **Verify File Type**:
   ```javascript
   // Supported types
   const supportedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
   ```

3. **CORS Configuration**:
   ```bash
   # Check S3 bucket CORS
   aws s3api get-bucket-cors --bucket location-detection-blueprints-prod
   ```

   Expected response:
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://your-domain.com"],
         "AllowedMethods": ["GET", "PUT"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```

   Fix CORS:
   ```bash
   aws s3api put-bucket-cors --bucket location-detection-blueprints-prod \
     --cors-configuration file://cors-config.json
   ```

4. **Check Network**:
   ```bash
   # Test connectivity
   curl -I https://api.location-detection.example.com/health
   ```

---

### Issue: Detection Takes Too Long

**Symptoms**:
- Processing stuck at same percentage
- Timeout errors after 5 minutes

**Solutions**:

1. **Check SageMaker Endpoint**:
   ```bash
   aws sagemaker describe-endpoint \
     --endpoint-name location-detector-prod
   ```

   Look for:
   - `EndpointStatus`: Should be "InService"
   - `CurrentInstanceCount`: Should be > 0

2. **Check Endpoint Logs**:
   ```bash
   aws logs tail /aws/sagemaker/Endpoints/location-detector-prod \
     --follow --since 10m
   ```

3. **Scale Up Endpoint**:
   ```bash
   aws sagemaker update-endpoint \
     --endpoint-name location-detector-prod \
     --endpoint-config-name location-detector-prod-scaled
   ```

4. **Optimize Image**:
   - Reduce image resolution (optimal: 1024x768)
   - Convert to PNG format
   - Remove unnecessary metadata:
     ```bash
     convert input.png -strip -resize 1024x768 output.png
     ```

---

### Issue: No Rooms Detected

**Symptoms**:
- Detection completes but returns 0 rooms
- Empty results array

**Solutions**:

1. **Check Image Quality**:
   - Ensure blueprint has clear walls/boundaries
   - Verify image is not blurry
   - Check contrast is sufficient

2. **Verify Image Format**:
   ```bash
   # Check image info
   file floor-plan.png
   identify -verbose floor-plan.png
   ```

3. **Adjust Detection Parameters**:
   ```json
   {
     "minArea": 1000,        // Minimum room area (pixels)
     "maxArea": 1000000,     // Maximum room area (pixels)
     "threshold": 0.5,       // Detection confidence threshold
     "minWallLength": 50     // Minimum wall length (pixels)
   }
   ```

4. **Pre-process Image**:
   ```bash
   # Enhance contrast
   convert input.png -contrast-stretch 2%x1% output.png

   # Sharpen
   convert input.png -sharpen 0x1.0 output.png

   # Denoise
   convert input.png -despeckle output.png
   ```

---

## Frontend Issues

### Issue: React App Won't Start

**Symptoms**:
- `npm run dev` fails
- Port already in use
- Module not found errors

**Solutions**:

1. **Clear Cache and Reinstall**:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Port Availability**:
   ```bash
   # Find process using port 3000
   lsof -i :3000

   # Kill process
   kill -9 <PID>
   ```

3. **Check Node Version**:
   ```bash
   node --version  # Should be 18+
   npm --version   # Should be 9+
   ```

4. **Environment Variables**:
   ```bash
   # Verify .env file exists
   cat frontend/.env.local
   ```

---

### Issue: API Calls Failing

**Symptoms**:
- 404 errors
- CORS errors
- Network failures

**Solutions**:

1. **Check API URL**:
   ```javascript
   // frontend/.env.local
   VITE_API_GATEWAY_URL=https://your-api.execute-api.us-east-1.amazonaws.com/prod
   ```

2. **Verify Backend is Running**:
   ```bash
   curl https://your-api.execute-api.us-east-1.amazonaws.com/prod/health
   ```

3. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for network errors
   - Check request/response headers

4. **Test with cURL**:
   ```bash
   curl -v -X POST https://your-api/api/upload \
     -H "Content-Type: application/json" \
     -d '{"fileName":"test.png","fileType":"image/png","fileSize":1000}'
   ```

---

### Issue: Tests Failing

**Symptoms**:
- Vitest tests fail
- Playwright E2E tests timeout
- Coverage below threshold

**Solutions**:

1. **Run Tests in Watch Mode**:
   ```bash
   npm run test:ui
   ```

2. **Check Test Setup**:
   ```bash
   # Verify test files exist
   find frontend/src -name "*.test.tsx"
   ```

3. **Update Snapshots**:
   ```bash
   npm run test -- -u
   ```

4. **Playwright Issues**:
   ```bash
   # Install browsers
   npx playwright install

   # Run in headed mode for debugging
   npm run test:e2e:headed
   ```

---

## Backend Issues

### Issue: Lambda Function Errors

**Symptoms**:
- 500 errors from API
- Lambda timeouts
- Memory issues

**Solutions**:

1. **Check CloudWatch Logs**:
   ```bash
   aws logs tail /aws/lambda/location-detection-handler --follow
   ```

2. **Increase Memory/Timeout**:
   ```bash
   aws lambda update-function-configuration \
     --function-name location-detection-handler \
     --memory-size 2048 \
     --timeout 300
   ```

3. **Check IAM Permissions**:
   ```bash
   aws lambda get-function --function-name location-detection-handler | \
     jq '.Configuration.Role'
   ```

4. **Test Locally**:
   ```bash
   cd backend
   python -m pytest tests/ -v
   ```

---

### Issue: SageMaker Endpoint Not Responding

**Symptoms**:
- Endpoint returns 503 errors
- High latency
- Endpoint shows as "OutOfService"

**Solutions**:

1. **Check Endpoint Status**:
   ```bash
   aws sagemaker describe-endpoint \
     --endpoint-name location-detector-prod \
     --query 'EndpointStatus'
   ```

2. **View Endpoint Logs**:
   ```bash
   aws logs tail /aws/sagemaker/Endpoints/location-detector-prod --follow
   ```

3. **Update Endpoint**:
   ```bash
   # Create new endpoint config
   aws sagemaker create-endpoint-config \
     --endpoint-config-name location-detector-prod-v2 \
     --production-variants file://variant-config.json

   # Update endpoint
   aws sagemaker update-endpoint \
     --endpoint-name location-detector-prod \
     --endpoint-config-name location-detector-prod-v2
   ```

4. **Scale Endpoint**:
   ```bash
   aws application-autoscaling register-scalable-target \
     --service-namespace sagemaker \
     --resource-id endpoint/location-detector-prod/variant/AllTraffic \
     --scalable-dimension sagemaker:variant:DesiredInstanceCount \
     --min-capacity 2 \
     --max-capacity 5
   ```

---

### Issue: S3 Access Denied

**Symptoms**:
- 403 errors when uploading/downloading
- "Access Denied" messages

**Solutions**:

1. **Check Bucket Policy**:
   ```bash
   aws s3api get-bucket-policy \
     --bucket location-detection-blueprints-prod
   ```

2. **Verify IAM Role**:
   ```bash
   # Check Lambda execution role
   aws iam get-role-policy \
     --role-name location-detection-lambda-role \
     --policy-name S3AccessPolicy
   ```

3. **Check Bucket Permissions**:
   ```bash
   aws s3api get-bucket-acl \
     --bucket location-detection-blueprints-prod
   ```

4. **Test Access**:
   ```bash
   aws s3 ls s3://location-detection-blueprints-prod/
   ```

---

## Deployment Issues

### Issue: CDK Deployment Fails

**Symptoms**:
- `cdk deploy` errors
- Stack rollback
- Resource creation failures

**Solutions**:

1. **Check CDK Version**:
   ```bash
   cdk --version  # Should match package.json
   ```

2. **Bootstrap CDK**:
   ```bash
   cdk bootstrap aws://ACCOUNT-ID/REGION
   ```

3. **View Detailed Errors**:
   ```bash
   cdk deploy --verbose
   ```

4. **Check CloudFormation Events**:
   ```bash
   aws cloudformation describe-stack-events \
     --stack-name LocationDetectionStack \
     --max-items 20
   ```

5. **Validate Template**:
   ```bash
   cdk synth
   aws cloudformation validate-template \
     --template-body file://cdk.out/LocationDetectionStack.template.json
   ```

---

### Issue: Docker Build Fails

**Symptoms**:
- Docker build errors
- Image push failures
- ECR authentication issues

**Solutions**:

1. **Check Docker**:
   ```bash
   docker --version
   docker info
   ```

2. **Clean Docker Cache**:
   ```bash
   docker system prune -a
   ```

3. **ECR Login**:
   ```bash
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin \
     $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   ```

4. **Build with Verbose Output**:
   ```bash
   docker build --no-cache --progress=plain -t location-detector .
   ```

---

## Performance Issues

### Issue: Slow Response Times

**Symptoms**:
- API latency > 2 seconds
- Slow page loads
- Timeout errors

**Solutions**:

1. **Enable CloudFront Caching**:
   ```bash
   aws cloudfront create-cache-policy \
     --cache-policy-config file://cache-policy.json
   ```

2. **Add Lambda Provisioned Concurrency**:
   ```bash
   aws lambda put-provisioned-concurrency-config \
     --function-name location-detection-handler \
     --provisioned-concurrent-executions 5 \
     --qualifier LATEST
   ```

3. **Optimize SageMaker Instance**:
   ```bash
   # Use GPU instance for faster inference
   aws sagemaker create-endpoint-config \
     --endpoint-config-name location-detector-gpu \
     --production-variants InstanceType=ml.g4dn.xlarge,...
   ```

4. **Enable API Gateway Caching**:
   ```bash
   aws apigatewayv2 create-stage \
     --api-id <api-id> \
     --stage-name prod \
     --default-route-settings '{"CachingEnabled":true,"CacheTtlInSeconds":300}'
   ```

---

### Issue: High AWS Costs

**Symptoms**:
- Unexpected billing
- High SageMaker costs
- High S3 storage costs

**Solutions**:

1. **Review Cost Explorer**:
   ```bash
   aws ce get-cost-and-usage \
     --time-period Start=2025-11-01,End=2025-11-07 \
     --granularity DAILY \
     --metrics UnblendedCost
   ```

2. **Enable S3 Lifecycle Policies**:
   ```bash
   aws s3api put-bucket-lifecycle-configuration \
     --bucket location-detection-blueprints-prod \
     --lifecycle-configuration file://lifecycle.json
   ```

3. **Use Spot Instances for SageMaker**:
   ```json
   {
     "ProductionVariants": [{
       "VariantName": "AllTraffic",
       "InstanceType": "ml.m5.large",
       "InitialInstanceCount": 1,
       "ManagedInstanceScaling": {
         "Status": "ENABLED",
         "MinInstanceCount": 0,
         "MaxInstanceCount": 3
       }
     }]
   }
   ```

4. **Set Budget Alerts**:
   ```bash
   aws budgets create-budget \
     --account-id $AWS_ACCOUNT_ID \
     --budget file://budget-config.json
   ```

---

## Error Messages

### "Job not found"

**Cause**: Invalid or expired job ID

**Solution**:
```bash
# Verify job exists
aws dynamodb get-item \
  --table-name location-detection-jobs \
  --key '{"jobId":{"S":"YOUR-JOB-ID"}}'
```

### "File too large"

**Cause**: File exceeds 10MB limit

**Solution**:
```bash
# Compress image
convert large-image.png -quality 85 -resize 50% compressed.png
```

### "Invalid file type"

**Cause**: Unsupported file format

**Solution**: Convert to PNG or JPEG
```bash
convert blueprint.pdf blueprint.png
```

### "Service temporarily unavailable"

**Cause**: Backend service issue

**Solutions**:
1. Check service health: `/health`
2. View CloudWatch alarms
3. Check SageMaker endpoint status

---

## Debugging Tools

### Frontend Debugging

1. **React DevTools**:
   ```bash
   # Install extension
   # Chrome: https://chrome.google.com/webstore (React Developer Tools)
   ```

2. **Network Tab**:
   - Open DevTools (F12)
   - Network tab
   - Filter by XHR/Fetch

3. **Console Logs**:
   ```javascript
   // Enable verbose logging
   localStorage.setItem('debug', 'location-detection:*');
   ```

### Backend Debugging

1. **CloudWatch Insights**:
   ```sql
   fields @timestamp, @message
   | filter @message like /ERROR/
   | sort @timestamp desc
   | limit 20
   ```

2. **X-Ray Tracing**:
   ```bash
   aws xray get-trace-summaries \
     --start-time 2025-11-07T00:00:00Z \
     --end-time 2025-11-07T23:59:59Z
   ```

3. **Lambda Logs**:
   ```bash
   awslogs get /aws/lambda/location-detection-handler \
     --start='2h ago' \
     --watch
   ```

### Performance Debugging

1. **Lighthouse Audit**:
   ```bash
   lighthouse https://your-app.com \
     --output html \
     --output-path ./report.html
   ```

2. **Load Testing**:
   ```bash
   # Using Apache Bench
   ab -n 1000 -c 10 https://api.location-detection.example.com/health
   ```

3. **Memory Profiling**:
   ```javascript
   // In browser console
   performance.memory
   ```

---

## Getting Help

### Self-Service Resources
1. **Documentation**: https://docs.location-detection.example.com
2. **API Reference**: [API.md](./API.md)
3. **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)

### Support Channels
1. **GitHub Issues**: https://github.com/your-org/location-detection-ai/issues
2. **Email Support**: support@location-detection.example.com
3. **Community Forum**: https://forum.location-detection.example.com

### When Reporting Issues

Include:
1. **Environment**: Production, Staging, or Development
2. **Timestamp**: When the issue occurred
3. **Steps to Reproduce**: Detailed steps
4. **Expected vs Actual**: What should happen vs what happens
5. **Logs**: Relevant error messages and stack traces
6. **Request ID**: From API responses
7. **Screenshots**: If applicable

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
