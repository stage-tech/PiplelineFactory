import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { SubscriptionProtocol } from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { ServicePrincipals } from 'cdk-constants';
import { Construct } from 'constructs';
import path from 'path';

import { CloudWatchLogsTarget } from './cloudwatch-logs-target';
import NotificationsLambdaRole from './lambda-role';

export interface NotificationsProps {
  githubToken: string;
  lambdaCodeEntryPoint: string;
  organizationName: string;
  kmsEncryptionKey: kms.Key;
}

export default class Notifications extends Construct {
  constructor(scope: Construct, id: string, props: NotificationsProps) {
    super(scope, id);
    const projectName = cdk.Stack.of(this).stackName;
    const pipelineEventsTopic = new sns.Topic(this, 'PipelineEventsTopic', {
      topicName: 'pipeline-factory-events',
      masterKey: props.kmsEncryptionKey,
    });

    const snsEventTarget = new eventTargets.SnsTopic(pipelineEventsTopic);

    const pipelineCloudWatchLogGroup = new logs.LogGroup(this, 'PipelineLogs', {
      logGroupName: '/aws/events/PipeLineFactory-Pipeline-Events',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    pipelineCloudWatchLogGroup.grantWrite(new iam.ServicePrincipal(ServicePrincipals.EVENTS));

    const logGroupTarget = new CloudWatchLogsTarget(pipelineCloudWatchLogGroup);

    const rule = new events.Rule(this, 'pipelineEvents', {
      description: 'Forward code pipeline and build events to sns topic',
      enabled: true,
      ruleName: 'Pipeline-Factory-SNS',
      targets: [snsEventTarget, logGroupTarget],
      eventPattern: {
        source: ['aws.codepipeline', 'aws.codebuild'],
      },
    });

    new ssm.StringParameter(this, 'EventsTopicArn', {
      parameterName: '/pipeline-factory/events-sns-topic',
      stringValue: pipelineEventsTopic.topicArn,
    });

    const lambdaRole = new NotificationsLambdaRole(this, 'LambdaRole').lambdaRole;

    lambdaRole.attachInlinePolicy(
      new iam.Policy(this, 'SecretManagerPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            effect: iam.Effect.ALLOW,
            resources: ['arn:aws:secretsmanager:*:secret:/pipeline-factory/organization/*'],
          }),
          new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            effect: iam.Effect.ALLOW,
            resources: ['arn:aws:secretsmanager:*:secret:/pipeline-factory/notifications/*'],
          }),
          new iam.PolicyStatement({
            actions: [
              'codepipeline:ListActionExecutions',
              'codepipeline:GetPipelineExecution',
              'codepipeline:GetPipeline',
            ],
            effect: iam.Effect.ALLOW,
            resources: ['arn:aws:codepipeline:*:*'],
          }),
          new iam.PolicyStatement({
            actions: ['codebuild:BatchGetBuilds'],
            effect: iam.Effect.ALLOW,
            resources: ['arn:aws:codebuild:*:*'],
          }),
        ],
      }),
    );

    const githubToken = props.githubToken;
    const npmrcFileLocation = '/home/user/.npmrc'; //'/root/.npmrc'

    const lambdaCodeHandlerPath = path.join(props.lambdaCodeEntryPoint + '/notifications/pipeline-notifications-handler.js');
    const handler = new lambdaNodeJs.NodejsFunction(this, 'Lambda_PipelineNotification', {
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: `${projectName}-PipelineEvent-Notification`,
      handler: 'dist/notifications/pipeline-notifications-handler.handler',
      role: lambdaRole,
      environment: {
        ORGANIZATION_NAME: props.organizationName,
      },
      timeout: cdk.Duration.seconds(10),
      architecture: lambda.Architecture.X86_64,
      depsLockFilePath: path.join(__dirname, '../../../lambda/yarn.lock'),
      bundling: {
        externalModules: [
          'aws-sdk',
          '@aws-sdk/client-codebuild',
          'fsevents',
          '@octokit/rest',
          '@slack/web-api',
          'js-base64',
          '@aws-sdk/client-codepipeline',
        ],
        logLevel: lambdaNodeJs.LogLevel.WARNING,
        nodeModules: ['typescript'],
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          beforeInstall() {
            return [
              'npm config ls -l | grep config',
              `echo '@stage-tech:registry=https://npm.pkg.github.com/stage-tech' >> ${npmrcFileLocation}`,
              `echo '//npm.pkg.github.com/:_authToken=${githubToken}' >> ${npmrcFileLocation}`,
              `echo '//npm.pkg.github.com/stage-tech/:_authToken=${githubToken}' >> ${npmrcFileLocation}`,
              `echo '//npm.pkg.github.com/downloads/:_authToken=${githubToken}' >> ${npmrcFileLocation}`,
              'cat ${npmrcFileLocation}',
            ];
          },
        },
      },
      memorySize: 128,
      entry: lambdaCodeHandlerPath,
    });

    new sns.Subscription(this, 'lambda', {
      topic: pipelineEventsTopic,
      protocol: SubscriptionProtocol.LAMBDA,
      endpoint: handler.functionArn,
    });

    handler.addEventSource(new SnsEventSource(pipelineEventsTopic));
  }
}
