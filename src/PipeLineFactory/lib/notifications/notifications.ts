import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";
import * as ssm from "@aws-cdk/aws-ssm";
import * as lambda from "@aws-cdk/aws-lambda";
import * as eventTargets from "@aws-cdk/aws-events-targets";
import * as logs from "@aws-cdk/aws-logs";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import { SubscriptionProtocol } from "@aws-cdk/aws-sns";
import { SnsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { RemovalPolicy } from "@aws-cdk/core";
import { CloudWatchLogsTarget } from "./CloudWatchLogsTarget";
import { ServicePrincipals } from "cdk-constants";
import NotificationsLambdaRole from "./lambda-role";
export interface NotificationsProps {
  triggerCodeS3Key: string;
  projectName: any;
  slackChannelNamePrefix: string;
  slackWorkspaceId: string;
  triggerCodeS3Bucket: string | undefined;
}
export default class Notifications extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: NotificationsProps) {
    super(scope, id);
    const pipelineEventsTopic = new sns.Topic(this, "PipelineEventsTopic", {
      topicName: "pipeline-factory-events",
    });

    const snsEventTarget = new eventTargets.SnsTopic(pipelineEventsTopic);

    const pipelineCloudWatchLogGroup = new logs.LogGroup(this, "PipelineLogs", {
      logGroupName: "/aws/events/PipeLineFactory-Pipeline-Events",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    pipelineCloudWatchLogGroup.grantWrite(
      new iam.ServicePrincipal(ServicePrincipals.EVENTS)
    );

    const logGroupTarget = new CloudWatchLogsTarget(pipelineCloudWatchLogGroup);

    new ssm.StringParameter(this, "EventsTopicArn", {
      parameterName: "/pipeline-factory/events-sns-topic",
      stringValue: pipelineEventsTopic.topicArn,
    });

    const sourceCodeBucket = s3.Bucket.fromBucketAttributes(
      this,
      `PackageBucket`,
      { bucketName: props.triggerCodeS3Bucket }
    );

    const lambdaCode = lambda.Code.fromBucket(
      sourceCodeBucket,
      props.triggerCodeS3Key
    );

    const environmentVariables: { [key: string]: string } = {
      SLACK_WORKSPACE_ID: props.slackWorkspaceId,
      SLACK_CHANNEL_NAME_PREFIX: props.slackChannelNamePrefix,
    };

    const lambdaRole = new NotificationsLambdaRole(this , "LambdaRole" ).lambdaRole

    const handler = new lambda.Function(this, "Lambda_PipelineNotification", {
      runtime: lambda.Runtime.NODEJS_10_X,
      functionName: `${props.projectName}-PipelineEvent-Notification`,
      handler: "dist/pipeline-notifications-handler.handler",
      role: lambdaRole,
      code: lambdaCode,
      environment: environmentVariables,
      timeout: cdk.Duration.seconds(10),
    });

    new sns.Subscription(this, "lambda", {
      topic: pipelineEventsTopic,
      protocol: SubscriptionProtocol.LAMBDA,
      endpoint: handler.functionArn,
    });

    handler.addEventSource(new SnsEventSource(pipelineEventsTopic));
  }
}
