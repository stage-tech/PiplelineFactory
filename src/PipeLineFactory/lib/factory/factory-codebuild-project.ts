import * as cdk from "aws-cdk-lib";
import {IRole} from "aws-cdk-lib/aws-iam";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { Construct } from 'constructs';
import FactoryProps from "./factory-props";

export default class FactoryCodeBuildProject extends Construct {
  BuildProject: codebuild.Project;
  constructor(scope: Construct, id: string, props : FactoryProps , codebuildRole : IRole ) {
    super(scope, id);

    const projectName = cdk.Stack.of(this).stackName
    // this is the source code to get github specs
    const gitHubSource = codebuild.Source.gitHub({
      owner: props.pipelineTemplateGithubOwner,
      repo: props.pipelineTemplateRepositoryName,
      branchOrRef : props.pipelineTemplateBranchName,
      webhook: false,
    });

     // assumption about where the buildspec is located
    const buildSpecFile = "src/pipeline-template-cdk/buildspec.json";

    const cdkCodeBuilder = new codebuild.Project(
      this,
      "CodeBuild_CreatePipeline",
      {
        buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecFile),
        source: gitHubSource,
        role: codebuildRole,
        projectName : `${projectName}`,
        environment :  {
            buildImage : codebuild.LinuxBuildImage.STANDARD_6_0,
            privileged : true
        }
      }
    );

    this.BuildProject = cdkCodeBuilder;
  }
}
