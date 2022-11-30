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
const templateBranchName = app.node.tryGetContext('template_branch_name') ?? 'master';
const projectName = 'PipeLine-Factory-jegor';
const factoryProperties: FactoryProperties = {
  pipelineTemplateBranchName: templateBranchName,
  pipelineTemplateRepositoryName: 'pipeline-factory',
  pipelineTemplateGithubOwner: 'stage-tech',
  apiDomainCertificateArn: app.node.tryGetContext('apiDomainCertificateArn'),
  apiDomainName: app.node.tryGetContext('apiDomainName'),
  existingBucketName: app.node.tryGetContext('existingBucketName'),
  organizationName: app.node.tryGetContext('organizationName'),
  repositorySelector: `pipeline-factory-${env.account}`,
  lambdaCodeEntryPoint: path.join(__dirname, '../../lambda/dist/'),
  githubToken: process.env.NPM_TOKEN ?? '',
};
new TriggerStack(app, projectName, factoryProperties);
