import * as cdk from "@aws-cdk/core";
import * as sqs from "@aws-cdk/aws-sqs";
import * as lambda from "@aws-cdk/aws-lambda";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import TriggeringLambdaProperties from "../triggeringLambdaProperties";

export class Monitor extends cdk.Construct {
  public readonly buildProjectArn: string;
  constructor(
    scope: cdk.Construct,
    id: string,
    props: TriggeringLambdaProperties
  ) {
    super(scope, id);
    const queue = new sqs.Queue(this, "repository_discovery_jobs", {
      queueName: `repository_discovery_jobs`,
    });

    const sourceCodeBucket = s3.Bucket.fromBucketAttributes(
      this,
      `PackageBucket`,
      {
        bucketName: props.triggerCodeS3Bucket,
      }
    );

    const lambdaCode = lambda.Code.fromBucket(
      sourceCodeBucket,
      props.triggerCodeS3Key
    );

    const environmentVariables: { [key: string]: string } = {
      SQS_QUEUE_URL: queue.queueUrl,
      GITHUB_TOKEN_SECRET_NAME : props.default_github_token_secret_name
    };

    const lambdaRole = new iam.Role(this, "Role_LambdaFunction", {
      roleName: `PLF-${props.projectName}-Repository-Monitor`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    lambdaRole.addManagedPolicy( iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"))
    

    new lambda.Function(this, "Lambda_Repository_Monitor", {
      runtime: lambda.Runtime.NODEJS_10_X,
      functionName: `${props.projectName}-Repository-Monitor`,
      handler: "dist/monitor-repositories-handler.handler",
      role: lambdaRole,
      code: lambdaCode,
      environment: environmentVariables,
      timeout: cdk.Duration.seconds(10),
    });
  }
}
