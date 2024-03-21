import { GithubActionsIdentityProvider, GithubActionsRole } from 'aws-cdk-github-oidc';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface CodeBuildProjectProps {
  buildAsRoleArn: string;
  gitHubTokenSecretArn: string;
  githubRepositoryName: string;
  githubRepositoryOwner: string;
  githubRepositoryBranch: string;
  envName: string;
  projectName: string;
  artifactsBucketName: string;
  deployViaGitHubActions: boolean;
  githubOidcAllowAllRefs: boolean;
  buildSpecLocationOverride?: string;
  nodeVersion?: string;
  githubEnvironmentTag?: string;
}
export class CodeBuildProject extends Construct {
  buildProject: codebuild.Project;
  constructor(scope: Construct, id: string, props: CodeBuildProjectProps) {
    super(scope, id);
    this.buildProject = this.configureCodeBuildProject(props);
    if (props.deployViaGitHubActions) {
      this.configureGitHubOidcAuth(props);
    }
  }

  private configureCodeBuildProject(props: CodeBuildProjectProps) {
    const buildSpecFile = props.buildSpecLocationOverride ?? 'buildspec.yml';

    if (!props.artifactsBucketName) {
      throw new Error(`props.artifactsBucketName is empty`);
    }

    const artifactsBucket = s3.Bucket.fromBucketAttributes(this, 'PipeLineDeploymentArtifactsBucket', {
      bucketName: props.artifactsBucketName,
    });

    const gitHubSource = codebuild.Source.gitHub({
      owner: props.githubRepositoryOwner,
      repo: props.githubRepositoryName,
      webhook: false,
      cloneDepth: 1,
      fetchSubmodules: false,
      ...(props.deployViaGitHubActions ? { branchOrRef: `refs/heads/${props.githubRepositoryBranch}` } : {}),
    });

    const buildAsRole = iam.Role.fromRoleArn(this, 'BuildAsRole', props.buildAsRoleArn);

    return new codebuild.Project(this, 'codebuildProject', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecFile),
      role: buildAsRole,
      source: gitHubSource,
      environment: {
        buildImage:
          props.nodeVersion === '18' ? codebuild.LinuxBuildImage.STANDARD_7_0 : codebuild.LinuxBuildImage.STANDARD_6_0,
        privileged: true,
        computeType: codebuild.ComputeType.LARGE,
      },
      timeout: cdk.Duration.hours(2),

      projectName: `PLF-${props.projectName}`,
      environmentVariables: {
        ENV_NAME: {
          value: props.envName.toLowerCase(),
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
        STAGE_ENV_NAME: {
          value: props.envName.toLowerCase(),
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
        STAGE_PACKAGE_BUCKET_NAME: {
          value: artifactsBucket.bucketName,
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
        GITHUB_TOKEN_SECRET_ARN: {
          value: props.gitHubTokenSecretArn,
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
        GITHUB_TOKEN_SECRETNAME: {
          value: props.gitHubTokenSecretArn,
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
        GITHUB_REPOSITORY_BRANCH: {
          value: props.githubRepositoryBranch,
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
        ACCOUNT: {
          value: cdk.Stack.of(this).account,
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
        AWS_REGION: {
          value: cdk.Stack.of(this).region,
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        },
      },
      artifacts: codebuild.Artifacts.s3({
        bucket: artifactsBucket,
        includeBuildId: true,
        name: `${props.githubRepositoryName}`,
        packageZip: true,
      }),
    });
  }

  private configureGitHubOidcAuth(props: CodeBuildProjectProps) {
    const provider = GithubActionsIdentityProvider.fromAccount(this, 'GitHubProvider');

    const filter = getFilter(props.githubOidcAllowAllRefs, props.githubRepositoryBranch, props.githubEnvironmentTag);

    const executionRole = new GithubActionsRole(this, `${props.projectName}-github-oidc-role`, {
      roleName: `${props.projectName}-github-oidc-role`,
      provider,
      owner: props.githubRepositoryOwner,
      repo: props.githubRepositoryName,
      filter: filter,
      maxSessionDuration: cdk.Duration.hours(3),
    });
    executionRole.addToPolicy(
      new PolicyStatement({
        sid: 'CodeBuildPolicy',
        effect: Effect.ALLOW,
        actions: ['codebuild:StartBuild', 'codebuild:BatchGetBuilds'],
        resources: [this.buildProject.projectArn],
      }),
    );
    executionRole.addToPolicy(
      new PolicyStatement({
        sid: 'LogPolicy',
        effect: Effect.ALLOW,
        actions: ['logs:GetLogEvents'],
        resources: [
          `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/codebuild/${
            this.buildProject.projectName
          }:*`,
        ],
      }),
    );
  }
}

function getFilter(
  githubOidcAllowAllRefs: boolean,
  githubRepositoryBranch: string,
  githubEnvironmentTag?: string,
): string {
  if (githubOidcAllowAllRefs) {
    return '*';
  } else if (githubEnvironmentTag) {
    return `environment:${githubEnvironmentTag}`;
  } else {
    return `ref:refs/heads/${githubRepositoryBranch}`;
  }
}
