import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import path from 'path';

import ApiHandlerLambdaRole from './lambda-role';

export interface BranchHandlersProps {
  lambdaCodeEntryPoint: string;
  githubToken: string;
  factoryBuilderProjectName: string;
  triggerCodeS3Key: string;
  triggerCodeS3Bucket: string;
}
export default class BranchHandlers extends Construct {
  public readonly apiBranchCreated: IFunction;

  public readonly apiBranchDeleted: IFunction;

  constructor(scope: Construct, id: string, props: BranchHandlersProps) {
    super(scope, id);

    const lambdaRole = new ApiHandlerLambdaRole(this, 'lambdaRole');
    const environmentVariables: { [key: string]: string } = {
      FACTORY_CODEBUILD_PROJECT_NAME: props.factoryBuilderProjectName,
    };

    const githubToken = props.githubToken;
    const npmrcFileLocation = '/root/.npmrc';

    this.apiBranchCreated = new lambdaNodeJs.NodejsFunction(this, 'Lambda_API_BranchCreation', {
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: `${cdk.Stack.of(this).stackName}-API-BranchCreatedHandler`,
      handler: 'dist/api/create-branch-handler.handler',
      role: lambdaRole.lambdaRole,
      environment: environmentVariables,
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
      entry: props.lambdaCodeEntryPoint + '/src/api/create-branch-handler.js',
    });

    this.apiBranchDeleted = new lambdaNodeJs.NodejsFunction(this, 'Lambda_API_BranchDeletion', {
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: `${cdk.Stack.of(this).stackName}-API-BranchDeletedHandler`,
      handler: 'dist/api/delete-branch-handler.handler',
      role: lambdaRole.lambdaRole,
      environment: environmentVariables,
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
      entry: props.lambdaCodeEntryPoint + '/src/api/delete-branch-handler.js',
    });
  }
}
