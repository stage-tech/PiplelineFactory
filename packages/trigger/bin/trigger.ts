#!/usr/bin/env node
import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import path from 'path';

import FactoryProperties from '../src/factoryProperties';
import { TriggerStack } from '../src/trigger-stack';
const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};
const s3_lambda_object_key = app.node.tryGetContext('s3_lambda_object_key');
const s3_bucket_name = app.node.tryGetContext('s3_bucket_name');
const templateBranchName = app.node.tryGetContext('template_branch_name') ?? 'master';
console.log(`s3_lambda_object_key ${s3_lambda_object_key} , s3_bucket_name ${s3_bucket_name} `);
const projectName = 'PipeLine-Factory-jegor';
const factoryProperties: FactoryProperties = {
  pipelineTemplateBranchName: templateBranchName,
  pipelineTemplateRepositoryName: 'pipeline-factory',
  pipelineTemplateGithubOwner: 'stage-tech',
  triggerCodeS3Bucket: s3_bucket_name,
  triggerCodeS3Key: s3_lambda_object_key,
  apiDomainCertificateArn: app.node.tryGetContext('apiDomainCertificateArn'),
  apiDomainName: app.node.tryGetContext('apiDomainName'),
  existingBucketName: app.node.tryGetContext('existingBucketName'),
  organizationName: app.node.tryGetContext('organizationName'),
  repositorySelector: `pipeline-factory-${env.account}`,
  lambdaCodeEntryPoint: path.join(__dirname, '../../lambda/dist/src/notifications/pipeline-notifications-handler.js'),
  githubToken: process.env.NPM_TOKEN ?? '',
};
new TriggerStack(app, projectName, factoryProperties);
