import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import path from 'path';

export interface MonitorProps {
  lambdaCodeEntryPoint: string;
  githubToken: string;
  organizationName: string;
  PipelineFactoryBuildProjectName: string;
  repositorySelector: string;
}

export class Monitor extends Construct {
  public readonly buildProjectArn: string;
  constructor(scope: Construct, id: string, props: MonitorProps) {
    super(scope, id);
    const queue = new sqs.Queue(this, 'repository_discovery_jobs', {
      queueName: `repository_discovery_jobs`,
    });

    const stackName = cdk.Stack.of(this).stackName;
    const lambdaRole = new iam.Role(this, 'Role_LambdaFunction', {
      roleName: `PLF-${stackName}-Repository-Monitor`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

    lambdaRole.attachInlinePolicy(
      new iam.Policy(this, 'SecretManagerPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            effect: iam.Effect.ALLOW,
            resources: ['arn:aws:secretsmanager:*:secret:/pipeline-factory/organization/*'],
          }),
          new iam.PolicyStatement({
            actions: ['cloudformation:DescribeStacks'],
            effect: iam.Effect.ALLOW,
            resources: ['*'],
          }),
          new iam.PolicyStatement({
            resources: [`arn:aws:codebuild:*:*:project/${props.PipelineFactoryBuildProjectName}`],
            actions: ['codebuild:StartBuild'],
          }),
          new iam.PolicyStatement({
            actions: ['sqs:*'],
            effect: iam.Effect.ALLOW,
            resources: [queue.queueArn],
          }),
        ],
      }),
    );

    const repositoryMonitor = new lambdaNodeJs.NodejsFunction(this, 'Lambda_Repository_Monitor', {
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: `${stackName}-Repository-Monitor`,
      handler: 'handler',
      role: lambdaRole,

      environment: {
        SQS_QUEUE_URL: queue.queueUrl,
        ORGANIZATION_NAME: props.organizationName,
      },
      timeout: cdk.Duration.minutes(10),
      architecture: lambda.Architecture.X86_64,
      depsLockFilePath: path.join(__dirname, '../../../lambda/yarn.lock'),
      bundling: {
        logLevel: lambdaNodeJs.LogLevel.WARNING,
      },
      memorySize: 128,
      entry: path.join(props.lambdaCodeEntryPoint, '/monitor/handler-monitor-repositories.ts'),
    });

    new events.Rule(this, 'Schedule', {
      ruleName: `${stackName}-trigger-repository-monitoring`,
      targets: [new eventTargets.LambdaFunction(repositoryMonitor)],
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
    });

    const pipelineManagementHandler = new lambdaNodeJs.NodejsFunction(this, 'Lambda_Pipeline_Manager', {
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: `${stackName}-Pipeline-Manager`,
      handler: 'handler',
      role: lambdaRole,
      environment: {
        FACTORY_CODEBUILD_PROJECT_NAME: props.PipelineFactoryBuildProjectName,
        REPOSITORY_SELECTOR: props.repositorySelector,
      },
      timeout: cdk.Duration.seconds(10),
      architecture: lambda.Architecture.X86_64,
      depsLockFilePath: path.join(__dirname, '../../../lambda/yarn.lock'),
      bundling: {
        logLevel: lambdaNodeJs.LogLevel.WARNING,
      },
      memorySize: 128,
      entry: path.join(props.lambdaCodeEntryPoint, '/monitor/handler-pipeline-management.ts'),
    });

    pipelineManagementHandler.addEventSource(new SqsEventSource(queue));
  }
}
