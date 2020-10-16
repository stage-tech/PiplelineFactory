#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { TriggerStack } from '../lib/trigger-stack';
import FactoryProperties from  '../lib/factoryProperties'

const stageDev = { account: '928065939415', region: 'eu-west-1' };

const projectName : string = "PipeLine-Factory"
const factoryProperties : FactoryProperties = {
    githubRepositoryBranch : "feat/spx-116",
    githubRepositoryName : "pipeline-factory",
    githubRepositoryOwner : "stage-tech",
    projectName : projectName,
    env : stageDev,
    defaultArtifactsBucket : "salt-deployment-packages",
    default_github_token_secret_name : "/global/GitHubToken",
    apiDomainCertificateArn : "arn:aws:acm:eu-west-1:928065939415:certificate/257976ea-e9ff-4a05-8dba-a034f2228326",
    apiDomainName : "pipeline-factory.tools.salt-dev.ws",
    slackWorkspaceId: "T5J1W20JV",
    slackChannelNamePrefix: "sphinx-env-",
    triggerCodeS3Bucket : "salt-deployment-packages",
    triggerCodeS3Key : "pipeline-factory/feat/spx-116/pipeline-factory-lambda-73c4a94.zip"
}
const app = new cdk.App();
new TriggerStack(app,projectName , factoryProperties);
