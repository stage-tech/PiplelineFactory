import { AWSDevToolsClient } from '../clients/aws-dev-tools-client';
import { GithubClient } from '../clients/github-client';
import { NotificationTarget } from '../models';

export class NotificationTargetsManager {
  private awsClient: AWSDevToolsClient;
  private githubClient: GithubClient;

  constructor(awsClient: AWSDevToolsClient, githubClient: GithubClient) {
    this.awsClient = awsClient;
    this.githubClient = githubClient;
  }

  public getNotificationTargets = async (
    githubConfigs: { owner: string; repository: string; branch: string },
    eventState: string,
  ): Promise<NotificationTarget[]> => {
    const repo = await this.githubClient.getRepository(githubConfigs.owner, githubConfigs.repository);

    const factorySettings = repo.settings;
    if (!factorySettings?.notifications) {
      return [];
    }

    const notificationTargets = factorySettings.notifications.filter((setting) => {
      return setting.event === eventState && setting.branches.includes(githubConfigs.branch);
    });
    const matchingTargets = notificationTargets.map((t) => ({
      channelId: t.channelId,
      channelType: t.channelType,
    }));

    const uniqueTargets: NotificationTarget[] = [];
    matchingTargets.forEach((t) => {
      if (
        uniqueTargets.find(
          (ut) => ut.channelId.toLowerCase() == t.channelId.toLowerCase() && t.channelType == ut.channelType,
        )
      ) {
        return;
      } else {
        uniqueTargets.push(t);
      }
    });

    return uniqueTargets;
  };
}
