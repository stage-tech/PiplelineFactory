import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { ApiKeySourceType } from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

import BranchHandlers from './branchHandlers';

export interface ApiProps {
  apiBranchCreated: IFunction;
  apiBranchDeleted: IFunction;
}

export default class ApiEntryPoint extends Construct {
  public readonly buildProjectArn: string;
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);
    const projectName = cdk.Stack.of(this).stackName;
    const entryPointApi = new apigateway.RestApi(this, 'APIGateway', {
      restApiName: projectName,
      apiKeySourceType: ApiKeySourceType.HEADER,
    });

    const creationLambda = new apigateway.LambdaIntegration(props.apiBranchCreated, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    const branchCreation = entryPointApi.root.addResource('branch-created');
    branchCreation.addMethod('POST', creationLambda, {
      apiKeyRequired: true,
    });

    const deletionLambda = new apigateway.LambdaIntegration(props.apiBranchDeleted, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    const branchDeletion = entryPointApi.root.addResource('branch-deleted');
    branchDeletion.addMethod('POST', deletionLambda, {
      apiKeyRequired: true,
    });

    const apiKey = new apigateway.ApiKey(this, `ApiGatewayKey`, {
      apiKeyName: `${projectName}-access-key`,
      description: `APIKey used to access PLF API`,
      enabled: true,
    });

    const usagePlan = new apigateway.UsagePlan(this, 'UsagePlan', {
      name: 'Basic Unlimited',
      apiStages: [
        {
          api: entryPointApi,
          stage: entryPointApi.deploymentStage,
        },
      ],
    });
    usagePlan.addApiKey(apiKey);
    

    new cdk.CfnOutput(this, 'APIUrl', {
      value: entryPointApi.url,
      exportName: `${projectName}-api-url`,
    });
  }
}
