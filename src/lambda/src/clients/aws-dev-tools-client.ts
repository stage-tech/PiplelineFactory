import { Build, CodeBuild } from '@aws-sdk/client-codebuild';
import { ActionExecutionDetail, CodePipeline, PipelineExecution } from '@aws-sdk/client-codepipeline';

export class AWSDevToolsClient {
  private codepipeline: CodePipeline;
  private codebuild: CodeBuild;
  constructor() {
    this.codepipeline = new CodePipeline({ region: 'eu-west-1' });
    this.codebuild = new CodeBuild({ region: 'eu-west-1' });
  }

  public async getPipelineSourceConfigurations(pipelineName: string): Promise<{
    owner: string;
    repository: string;
    branch: string;
  }> {
    const response = await this.codepipeline.getPipeline({
      name: pipelineName,
    });
    const fetchingStage = response.pipeline?.stages?.find((s) => s.name == 'Fetch');
    const githubConfiguration =
      fetchingStage?.actions?.find((a) => a.actionTypeId?.category == 'Source')?.configuration ?? {};
    const githubConfigs = {
      owner: githubConfiguration['Owner'],
      repository: githubConfiguration['Repo'],
      branch: githubConfiguration['Branch'],
    };
    return githubConfigs;
  }

  public async getPipelineExecution(pipelineName: string, executionId: string): Promise<PipelineExecution> {
    const response = await this.codepipeline.getPipelineExecution({
      pipelineExecutionId: executionId,
      pipelineName: pipelineName,
    });

    if (!response.pipelineExecution) {
      throw new Error('cannot find execution by id');
    }
    return response.pipelineExecution;
  }

  async getFailedAction(pipeline: string, executionId: string): Promise<ActionExecutionDetail | undefined> {
    const response = await this.codepipeline.listActionExecutions({
      pipelineName: pipeline,
      filter: {
        pipelineExecutionId: executionId,
      },
    });
    const failedExecution = response.actionExecutionDetails?.find(
      (actionExecution) => actionExecution.status === 'Failed',
    );
    return failedExecution;
  }
}
