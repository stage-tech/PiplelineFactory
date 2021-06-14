import { WebClient } from '@slack/web-api';
import AWS from 'aws-sdk';

import { ChannelType, NotificationPayload } from '../models';

export interface INotificationDeliveryClient {
  supportedChannel(channel: string, channelType: ChannelType): void;
  send(data: NotificationPayload): void;
}

export class SlackNotificationDeliveryClient implements INotificationDeliveryClient {
  private channel: string;
  public send = async (data: NotificationPayload): Promise<void> => {
    try {
      const ssm = new AWS.SecretsManager();
      const parameterReadResponse = await ssm
        .getSecretValue({
          SecretId: `/pipeline-factory/notifications/slack/${this.channel}/webhook`,
        })
        .promise();
      const token = parameterReadResponse.SecretString;
      const slackClient = new WebClient(token);
      await slackClient.chat.postMessage({
        mrkdwn: true,
        text: typeof data === 'string' ? data : SlackNotificationDeliveryClient.formatSlackMessage(data),
        channel: this.channel,
      });
    } catch (error) {
      console.error(`Error while publishing message to Slack: ${error}`);
      throw error;
    }
  };

  private static formatSlackMessage = (data: NotificationPayload): string => {
    return Object.keys(data)
      .map((key) => {
        return `${key}: ${data[key]}`;
      })
      .join('\n');
  };

  public supportedChannel(channel: string, channelType: ChannelType) {
    if (channelType !== 'SLACK') {
      throw new Error(`Expected channelType of SLACK but retrieved was: ${channelType}`);
    }
    this.channel = channel;
  }
}
