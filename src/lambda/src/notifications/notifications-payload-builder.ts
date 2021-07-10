import { AWSDevToolsClient } from '../clients/aws-dev-tools-client';
import { GithubClient } from '../clients/github-client';
import { NotificationPayload } from '../models';

export class NotificationsPayloadBuilder {
  constructor(private awsClient: AWSDevToolsClient, private gitHubClient: GithubClient) {}

  async buildNotificationPayload(event: { pipelineName: string; executionId: string }): Promise<NotificationPayload> {
    const { pipelineName, executionId } = event;
    const pipelineExecution = await this.awsClient.getPipelineExecution(pipelineName, executionId);
    const githubConfigs = await this.awsClient.getPipelineSourceConfigurations(pipelineName);
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
      pipelineName: pipelineName,
      pipelineState: pipelineExecution.status?.toUpperCase() || '',
      pipelineExecutionId: executionId,
      commitUrl: commitInfo.url || '',
      commitMessage: commitInfo.message || '',
      commitAuthor: commitInfo.author || '',
      commitDate: commitInfo.date || '',
      failureLogs: failureDetails?.link,
      failureSummary: failureDetails?.summary,
      failurePhase: failureDetails?.step,
    };
  }
}
