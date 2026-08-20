import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { EndpointType, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AllowedMethods, CachePolicy, Distribution, OriginRequestPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3BucketOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, DockerImageCode, DockerImageFunction, FunctionUrlAuthType, InvokeMode } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface AppStackProps extends StackProps {
  stage: string;
}


export class AppStack extends Stack {
    constructor(scope: Construct, id: string, props: AppStackProps) {
        super(scope, id, props);

        const bucket = new Bucket(this, 'trivai-bucket', {
            bucketName: `trivai-bucket-${props.stage}`,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        new BucketDeployment(this, 'trivai-bucket-deployment', {
            sources: [Source.asset('../web/public')],
            destinationBucket: bucket,
            destinationKeyPrefix: 'public',
        });

        const logGroup = new LogGroup(this, 'trivai-log-group', {
            logGroupName: `/aws/lambda/trivai-lambda-${props.stage}`,
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_WEEK,
        });

        const lambda = new DockerImageFunction(this, 'trivai-lambda', {
            functionName: `trivai-lambda-${props.stage}`,
            code: DockerImageCode.fromImageAsset('../web', {
                platform: Platform.LINUX_ARM64,
            }),
            architecture: Architecture.ARM_64,
            logGroup: logGroup,
            environment: {
                ASSETS_BUCKET_NAME: bucket.bucketName,
                AWS_LWA_INVOKE_MODE: 'response_stream',
            },
            timeout: Duration.minutes(5),
        });
        bucket.grantReadWrite(lambda);
        lambda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            resources: ['*'],
        }));
        const functionUrl = lambda.addFunctionUrl({
            authType: FunctionUrlAuthType.NONE,
            invokeMode: InvokeMode.RESPONSE_STREAM,
        });

        const api = new RestApi(this, 'trivai-api', {
            restApiName: `trivai-api-${props.stage}`,
            binaryMediaTypes: ['application/pdf', "multipart/form-data"],
            deployOptions: {
                stageName: "app",
            },
            endpointConfiguration: {
                types: [EndpointType.REGIONAL],
            },
        });

        api.root.addMethod('ANY', new LambdaIntegration(lambda));
        api.root.addProxy({
            defaultIntegration: new LambdaIntegration(lambda),
            anyMethod: true,
        });

        const distribution = new Distribution(this, 'trivai-distribution', {
            comment: `trivai-distribution-${props.stage}`,
            defaultBehavior: {
                // use the function url instead of the api gateway, because the api has 29 second timeout, which is not enough for large pdfs.
                /* origin: new HttpOrigin(`${api.restApiId}.execute-api.${this.region}.amazonaws.com`, {
                    originPath: '/app',
                }), */
                origin: new HttpOrigin(Fn.parseDomainName(functionUrl.url), {
                    readTimeout: Duration.minutes(2),
                }),
                allowedMethods: AllowedMethods.ALLOW_ALL,
                cachePolicy: CachePolicy.CACHING_DISABLED,
                originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            additionalBehaviors: {
                '/assets/*': {
                    origin: S3BucketOrigin.withOriginAccessControl(bucket, {
                        originPath: '/public',
                    }),
                    allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                    cachePolicy: CachePolicy.CACHING_OPTIMIZED,
                    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                },
            },
        });

        new CfnOutput(this, 'DistributionDomainName', {
            value: distribution.distributionDomainName,
            description: 'The domain name of the CloudFront distribution',
        });
    }
}
