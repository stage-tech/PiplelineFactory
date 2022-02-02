import { AWSDevToolsClient } from '../../clients/aws-dev-tools-client';
import { GithubClient } from '../../clients/github-client';
import { NotificationPayload } from '../../models';
import { INotificationsPayloadBuilder } from './interface';

export class CodeBuildNotificationsPayloadBuilder implements INotificationsPayloadBuilder {
  constructor(
    private awsClient: AWSDevToolsClient,
    private gitHubClient: GithubClient,
    private event: { name: string; executionId: string },
  ) {}

  async buildNotificationPayload(): Promise<NotificationPayload> {
    const { name: pipelineName, executionId } = this.event;
    const pipelineExecution = await this.awsClient.getPipelineExecution(pipelineName, executionId);
    const githubConfigs = await this.awsClient.getBuildSourceConfigurations(pipelineName);
    const artifactRevision = pipelineExecution.artifactRevisions ? pipelineExecution?.artifactRevisions[0] : undefined;
    if (!artifactRevision?.revisionId) {
      throw new Error('cannot get version information');
    }

    const commitInfo = await this.gitHubClient.getCommitInfo(
      githubConfigs.owner,
      githubConfigs.repository,
      artifactRevision.revisionId,
    );

    let failureDetails: { link?: string; summary?: string; step?: string } | undefined;
    if (pipelineExecution.status?.toUpperCase() == 'FAILED') {
      const failedExecution = await this.awsClient.getFailedAction(pipelineName, executionId);
      failureDetails = {
        link: failedExecution?.output?.executionResult?.externalExecutionUrl,
        summary: failedExecution?.output?.executionResult?.externalExecutionSummary,
        step: failedExecution?.actionName,
      };
    }
    return {
      name: pipelineName,
      state: pipelineExecution.status?.toUpperCase() || '',
      executionId: executionId,
      commitUrl: commitInfo.url || '',
      commitMessage: commitInfo.message || '',
      commitAuthor: commitInfo.author || '',
      commitDate: commitInfo.date || '',
      failureLogs: failureDetails?.link,
      failureSummary: failureDetails?.summary,
      failurePhase: failureDetails?.step,
      codeInformation: githubConfigs,
    };
  }
}
