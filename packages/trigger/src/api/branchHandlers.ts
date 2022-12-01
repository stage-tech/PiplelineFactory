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

    this.apiBranchCreated = new lambdaNodeJs.NodejsFunction(this, 'Lambda_API_BranchCreation', {
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: `${cdk.Stack.of(this).stackName}-API-BranchCreatedHandler`,
      handler: 'handler',
      role: lambdaRole.lambdaRole,
      environment: environmentVariables,
      timeout: cdk.Duration.seconds(10),
      architecture: lambda.Architecture.X86_64,
      depsLockFilePath: path.join(__dirname, '../../../lambda/yarn.lock'),
      bundling: {
        logLevel: lambdaNodeJs.LogLevel.WARNING,
      },
      memorySize: 128,
      entry: path.join(props.lambdaCodeEntryPoint, '/api/create-branch-handler.ts'),
    });

    this.apiBranchDeleted = new lambdaNodeJs.NodejsFunction(this, 'Lambda_API_BranchDeletion', {
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: `${cdk.Stack.of(this).stackName}-API-BranchDeletedHandler`,
      handler: 'handler',
      role: lambdaRole.lambdaRole,
      environment: environmentVariables,
      timeout: cdk.Duration.seconds(10),
      architecture: lambda.Architecture.X86_64,
      depsLockFilePath: path.join(__dirname, '../../../lambda/yarn.lock'),
      bundling: {
        logLevel: lambdaNodeJs.LogLevel.WARNING,
      },
      memorySize: 128,
      entry: path.join(props.lambdaCodeEntryPoint, '/api/delete-branch-handler.ts'),
    });
  }
}
