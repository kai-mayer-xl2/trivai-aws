import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AllowedMethods, CachePolicy, Distribution, OriginRequestPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Architecture, DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
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
            },
            timeout: Duration.minutes(5),
        });
        bucket.grantReadWrite(lambda);

        const api = new RestApi(this, 'trivai-api', {
            restApiName: `trivai-api-${props.stage}`,
            deployOptions: {
                stageName: "app",
            },
        });

        api.root.addMethod('ANY', new LambdaIntegration(lambda));
        api.root.addProxy({
            defaultIntegration: new LambdaIntegration(lambda),
            anyMethod: true,
        });

        const distribution = new Distribution(this, 'trivai-distribution', {
            defaultBehavior: {
                origin: new HttpOrigin(`${api.restApiId}.execute-api.${this.region}.amazonaws.com`, {
                    originPath: '/app',
                }),
                allowedMethods: AllowedMethods.ALLOW_ALL,
                cachePolicy: CachePolicy.CACHING_DISABLED,
                originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
        });
    }
}
