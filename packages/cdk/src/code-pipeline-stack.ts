import * as cdk from 'aws-cdk-lib';
import * as secretManager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { CodeBuildProject } from './code-build-project';
import { CodePipeline } from './code-pipeline';

export class CodePipelineStackProps implements cdk.StackProps {
  readonly tags?: { [key: string]: string };
  readonly env?: cdk.Environment;
  readonly githubRepositoryName: string;
  readonly githubRepositoryOwner: string;
  readonly githubRepositoryBranch: string;
  readonly envName: string;
  readonly projectName: string;
  readonly buildSpecFileRelativeLocation?: string;
  artifactsBucket?: string;
  buildAsRoleArn?: string;
  gitHubTokenSecretArn?: string;
  deployViaGitHubActions?: boolean;
  githubOidcAllowAllRefs?: boolean;
}

export class CodePipelineStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: CodePipelineStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('service', 'pipeline-factory');
    cdk.Tags.of(this).add('repository', `${props.githubRepositoryOwner}/${props.githubRepositoryName}`);
    cdk.Tags.of(this).add('branch', `${props.githubRepositoryBranch}`);

    const defaultArtifactBucketName = ssm.StringParameter.fromStringParameterName(
      this,
      'artifactsBucket',
      '/pipeline-factory/artifactsBucket',
    ).stringValue;

    if (props.artifactsBucket == undefined) {
      props.artifactsBucket = defaultArtifactBucketName;
    }

    const defaultGitHubSecretName = '/pipeline-factory/default-github-token';
    const defaultGitHubTokenSecretArn = secretManager.Secret.fromSecretNameV2(
      this,
      'DefaultGitHubSecret',
      defaultGitHubSecretName,
    ).secretArn;

    if (!props.gitHubTokenSecretArn) {
      props.gitHubTokenSecretArn = defaultGitHubTokenSecretArn;
    }

    const defaultBuildAsRoleArn = ssm.StringParameter.fromStringParameterName(
      this,
      'defaultBuildAsRoleArn',
      '/pipeline-factory/default-build-as-role',
    ).stringValue;
    if (!props.buildAsRoleArn) {
      props.buildAsRoleArn = defaultBuildAsRoleArn;
    }

    console.log(props);

    const builder = new CodeBuildProject(this, 'CodeBuilder', {
      artifactsBucketName: props.artifactsBucket,
      gitHubTokenSecretArn: props.gitHubTokenSecretArn,
      githubRepositoryBranch: props.githubRepositoryBranch,
      githubRepositoryName: props.githubRepositoryName,
      githubRepositoryOwner: props.githubRepositoryOwner,
      envName: props.envName,
      projectName: props.projectName,
      buildSpecLocationOverride: props.buildSpecFileRelativeLocation,
      buildAsRoleArn: props.buildAsRoleArn,
      deployViaGitHubActions: props.deployViaGitHubActions || false,
      githubOidcAllowAllRefs: props.githubOidcAllowAllRefs || false,
    });

    if (!props.deployViaGitHubActions) {
      new CodePipeline(this, 'CodePipeline', {
        artifactsBucketName: props.artifactsBucket,
        gitHubTokenSecretArn: props.gitHubTokenSecretArn,
        githubRepositoryBranch: props.githubRepositoryBranch,
        githubRepositoryName: props.githubRepositoryName,
        githubRepositoryOwner: props.githubRepositoryOwner,
        envName: props.envName,
        projectName: props.projectName,
        buildAsRoleArn: props.buildAsRoleArn,
        buildProject: builder.buildProject,
      });
    }
  }
}
