import { AWSClient } from '../clients/aws-client';
import { GithubClient } from '../clients/github-client';
import { NotificationPayload, PipelineEventDetail, PipelineExecutionEvent, PipelineState, StageName } from '../models';

export class NotificationsPayloadBuilder {
  private awsClient: AWSClient;
  private githubClient: GithubClient;
  constructor(awsClient: AWSClient, gitHubClient: GithubClient) {
    this.awsClient = awsClient;
    this.githubClient = gitHubClient;
  }
  async buildNotificationPayload(event: PipelineEventDetail): Promise<NotificationPayload | undefined> {
    const { pipeline, executionId, state } = event;
    const pipelineData = this.getPipelineData(state, pipeline, executionId);
    return pipelineData;
  }

  async getPipelineData(
    state: PipelineState,
    pipeline: string,
    executionId: string,
  ): Promise<NotificationPayload | undefined> {
    try {
      switch (state) {
        case PipelineState.STARTED:
          return await this.getPipelineStartOrSuccessData(pipeline, executionId);
        case PipelineState.SUCCEEDED:
          return await this.getPipelineStartOrSuccessData(pipeline, executionId);
        case PipelineState.FAILED:
          return await this.getPipelineFailureData(pipeline, executionId);
        default:
          return undefined;
      }
    } catch (error) {
      console.error(`Error while retrieving pipeline data: ${error}`);
      return undefined;
    }
  }

  async getPipelineStartOrSuccessData(pipeline: string, executionId: string): Promise<NotificationPayload> {
    const pipelineExecution = (await this.awsClient.getPipelineExecution(pipeline, executionId)).pipelineExecution;
    //@ts-ignore
    const artifactRevision = pipelineExecution?.artifactRevisions[0];
    return {
      pipelineName: pipeline,
      pipelineState: this.getState(this.required(pipelineExecution?.status.toUpperCase())),
      pipelineExecutionId: executionId,
      commitUrl: this.required(artifactRevision?.revisionUrl),
      commitMessage: this.required(artifactRevision?.revisionSummary),
      commitAuthor: this.required(await this.getAuthor(artifactRevision)),
    };
  }

  async getPipelineFailureData(pipeline: string, executionId: string): Promise<NotificationPayload> {
    const executionDetails = this.required(await this.getFailedStageActionExecution(pipeline, executionId));
    const artifactRevision = (await this.awsClient.getPipelineExecution(pipeline, executionId)).pipelineExecution
      ?.artifactRevisions[0];
    const commitAuthor = await this.getAuthor(artifactRevision);

    if (executionDetails.stageName === StageName.UNKNOWN) {
      throw Error('Retrieved unknown stage name');
    }
    if (executionDetails.stageName === StageName.BUILD) {
      const buildInfo = await this.getBuildInfo(executionDetails);
      return {
        pipelineName: pipeline,
        pipelineState: PipelineState.FAILED,
        pipelineExecutionId: executionId,
        commitUrl: artifactRevision.revisionUrl || '',
        commitMessage: artifactRevision.revisionSummary || '',
        commitAuthor: this.required(commitAuthor),
        pipelineFailiorStage: executionDetails.stageName,
        buildLogs: buildInfo.buildLogs,
        buildFailiorPhase: buildInfo.failedPhase,
      };
    } else {
      return {
        pipelineName: pipeline,
        pipelineState: PipelineState.FAILED,
        pipelineExecutionId: executionId,
        commitUrl: artifactRevision.revisionUrl || '',
        commitMessage: artifactRevision.revisionSummary || '',
        commitAuthor: this.required(commitAuthor),
        pipelineFailiorStage: this.getStageName(this.required(executionDetails.stageName)),
      };
    }
  }

  async getBuildInfo(executionsDetails: any): Promise<any> {
    const buildId = executionsDetails.output.executionResult.externalExecutionId;
    const build = await this.awsClient.getBuild(buildId);
    return {
      // @ts-ignore
      buildLogs: build.logs.deepLink,
      failedPhase: build.phases?.find((phase) => phase.phaseStatus === 'FAILED')?.phaseType,
    };
  }

  async getAuthor(artifactRevision: any): Promise<string | void> {
    const repoName = NotificationsPayloadBuilder.getRepoFromArtifactRevision(artifactRevision);
    const organization = NotificationsPayloadBuilder.getOrganizationNameFromArtifactRevision(artifactRevision);
    return (await this.githubClient.getCommitAuthor(organization, repoName, artifactRevision.revisionId)) || '';
  }

  static getRepoFromArtifactRevision(artifactRevision: any): string {
    const commitUrl = artifactRevision.revisionUrl?.split('/');
    return commitUrl[commitUrl.length - 3];
  }

  static getOrganizationNameFromArtifactRevision(artifactRevision: any): string {
    const commitUrl = artifactRevision.revisionUrl?.split('/');
    return commitUrl[commitUrl.length - 4];
  }

  getEventDetails(event: PipelineExecutionEvent): PipelineEventDetail | undefined {
    const DETAIL_TYPE = 'CodePipeline Pipeline Execution State Change';
    if (event['detail-type'] == DETAIL_TYPE) {
      return {
        pipeline: event.detail.pipeline,
        executionId: event.detail['execution-id'],
        state: this.getState(event.detail.state),
      } as PipelineEventDetail;
    }
    return undefined;
  }

  async getFailedStageActionExecution(pipeline: string, executionId: string): Promise<any> {
    const actionExecutions = this.required(
      (await this.awsClient.getActionExecutions(pipeline, executionId)).actionExecutionDetails,
    );
    return actionExecutions.find((actionExecution) => actionExecution.status === 'Failed');
  }

  getState(state: string): PipelineState {
    switch (state) {
      case 'STARTED':
        return PipelineState.STARTED;
      case 'FAILED':
        return PipelineState.FAILED;
      case 'SUCCEEDED':
        return PipelineState.SUCCEEDED;
      default:
        return PipelineState.UNKNOWN;
    }
  }

  getStageName(stageName: string): StageName {
    switch (stageName) {
      case 'Fetch':
        return StageName.FETCH;
      case 'Build':
        return StageName.BUILD;
      case 'Deploy':
        return StageName.DEPLOY;
      default:
        return StageName.UNKNOWN;
    }
  }

  required<T>(input: T | undefined | null | void): T {
    if (input === null || input === undefined) {
      throw new Error('Field is required and should never be null, undefined or void');
    }
    return input;
  }
}
