import { WebClient } from '@slack/web-api';
import AWS from 'aws-sdk';

import { ChannelType, NotificationPayload, PipelineState } from '../models';

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
          SecretId: `/pipeline-factory/notifications/slack/webhook`,
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

  private static humanizeText(text: string): string {
    const result = text.replace(/([A-Z])/g, ' $1');
    const humanizedText = result.charAt(0).toUpperCase() + result.slice(1);
    return humanizedText;
  }

  private static formatSlackMessage(data: NotificationPayload): string {
    const messages: string[] = [];
    const emoji = data.pipelineState == PipelineState.SUCCEEDED ? ':white_check_mark:' : ':warning:';
    messages.push(
      `${emoji} Pipeline *${data.pipelineName}* finished with *${data.pipelineState}* <${data.buildLogs}|logs :aws: > `,
    );
    messages.push(`commit by *${data.commitAuthor}* "_${data.commitMessage}_" <${data.commitUrl}|view code :github:>`);
    if (data.pipelineState != PipelineState.SUCCEEDED) {
      messages.push(`failure happened during the phase ${data.pipelineFailureStage} (${data.buildFailurePhase})`);
    }
    return messages.join('\n');
  }

  public supportedChannel(channel: string, channelType: ChannelType) {
    if (channelType !== 'SLACK') {
      throw new Error(`Expected channelType of SLACK but retrieved was: ${channelType}`);
    }
    this.channel = channel;
  }
}
