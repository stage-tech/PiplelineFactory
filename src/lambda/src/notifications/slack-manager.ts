import { WebClient } from '@slack/web-api';
import AWS from 'aws-sdk';

import { ChannelType, NotificationPayload, NotificationTarget } from '../models';

export interface INotificationDeliveryClient {
  supportedChannel(): ChannelType;
  send(data: NotificationPayload, target: NotificationTarget): void;
}

export class SlackNotificationDeliveryClient implements INotificationDeliveryClient {
  public send = async (data: NotificationPayload, target: NotificationTarget): Promise<void> => {
    try {
      const ssm = new AWS.SecretsManager();
      const parameterReadResponse = await ssm
        .getSecretValue({
          SecretId: `/pipeline-factory/notifications/slack/webhook`,
        })
        .promise();
      const token = parameterReadResponse.SecretString;
      const slackClient = new WebClient(token);
      await slackClient.chat.postMessage({
        mrkdwn: true,
        text: typeof data === 'string' ? data : SlackNotificationDeliveryClient.formatSlackMessage(data),
        channel: target.channelId,
      });
    } catch (error) {
      console.error(`Error while publishing message to Slack: ${error}`);
      throw error;
    }
  };

  private static humanizeText(text: string): string {
    const result = text.replace(/([A-Z])/g, ' $1');
    const humanizedText = result.charAt(0).toUpperCase() + result.slice(1);
    return humanizedText;
  }

  private static formatSlackMessage(data: NotificationPayload): string {
    const messages: string[] = [];
    if (data.pipelineState == 'SUCCEEDED') {
      messages.push(`:white_check_mark: Pipeline *${data.pipelineName}* has *${data.pipelineState.toLowerCase()}*. `);
    } else {
      messages.push(`:warning: Pipeline *${data.pipelineName}* has *${data.pipelineState.toLowerCase()}*`);
      messages.push(
        `Failure message was "${data.failureSummary}" while executing  ${data.failurePhase} <${data.failureLogs}|logs :aws: > `,
      );
    }
    const commitTimeInEpoch = Math.floor(+Date.parse(data.commitDate) / 1000);

    messages.push(
      `commit by *${data.commitAuthor}* on <!date^${commitTimeInEpoch}^{date_short} {time_secs}|${data.commitDate}> "_${data.commitMessage}_" <${data.commitUrl}|view code :github:>`,
    );
    return messages.join('\n');
  }

  public supportedChannel(): ChannelType {
    return ChannelType.SLACK;
  }
}
