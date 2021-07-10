import { AWSDevToolsClient } from '../clients/aws-dev-tools-client';
import { GithubClient } from '../clients/github-client';
import { NotificationSettings } from '../models';

export class NotificationTargetsManager {
  private awsClient: AWSDevToolsClient;
  private githubClient: GithubClient;

  constructor(awsClient: AWSDevToolsClient, githubClient: GithubClient) {
    this.awsClient = awsClient;
    this.githubClient = githubClient;
  }

  public getNotificationTargets = async (pipelineName: string, eventState: string): Promise<NotificationSettings[]> => {
    try {
      const githubConfigs = await this.awsClient.getPipelineSourceConfigurations(pipelineName);

      const repo = await this.githubClient.getRepository(githubConfigs.owner, githubConfigs.repository);

      const factorySettings = repo.settings;
      if (!factorySettings?.notifications) {
        return [];
      }

      const notificationTargets = factorySettings.notifications.filter((setting) => {
        return setting.event === eventState && setting.branches.includes(githubConfigs.branch);
      });
      return notificationTargets;
    } catch (error) {
      console.log(`Error while retrieving notification targets ${error}`);
      throw error;
    }
  };
}
