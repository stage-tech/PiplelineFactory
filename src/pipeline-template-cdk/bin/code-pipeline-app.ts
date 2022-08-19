#!/usr/bin/env node
require("dotenv").config();
import * as cdk from "aws-cdk-lib";
import { Utility } from "./utility";
import { CodePipelineStack } from "../lib/code-pipeline-stack";

const githubRepositoryName = ensureEnvironmentVariable(`GITHUB_REPOSITORY_NAME`);
const githubRepositoryOwner = ensureEnvironmentVariable("GITHUB_REPOSITORY_OWNER");
const githubRepositoryBranch = ensureEnvironmentVariable("GITHUB_REPOSITORY_BRANCH");

// extract env name for branches prefixed with deploy/
const envName = githubRepositoryBranch.toLowerCase().startsWith("deploy/")
    ? githubRepositoryBranch.substring("deploy/".length)
    : githubRepositoryBranch;

const app = new cdk.App();
const projectName = Utility.sanitizeStackName(
  `${githubRepositoryName}-${envName}`
).toLowerCase();

function ensureEnvironmentVariable(variableName: string): string {
  if (!process.env[variableName] || process.env[variableName] == undefined) {
    throw new Error(`env variable ${variableName} is not defined`);
  }
  return process.env[variableName] || "";
}

new CodePipelineStack(app, `PLF-${projectName}`, {
  githubRepositoryName: githubRepositoryName,
  githubRepositoryOwner: githubRepositoryOwner,
  githubRepositoryBranch: githubRepositoryBranch,
  envName: envName,
  buildAsRoleArn: process.env.BUILD_AS_ROLE_ARN,
  buildSpecFileRelativeLocation: process.env.BUILD_SPEC_RELATIVE_LOCATION,
  gitHubTokenSecretArn: process.env.GITHUB_TOKEN_SECRET_ARN,
  artifactsBucket: process.env.ARTIFACTS_BUCKET,
  deployViaGitHubActions: process.env.DEPLOY_VIA_GITHUB_ACTIONS == 'true',
  projectName: projectName,
  env : {
    account : process.env.CDK_DEFAULT_ACCOUNT ,
    region :  process.env.CDK_DEFAULT_REGION
  }
});
