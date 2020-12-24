import AWS from 'aws-sdk';

import { DiscoveryJob } from './models';

export class JobScheduler {
  constructor(private queueUrl: string, private sqsClient: AWS.SQS) {}
  public async queueRepositoryDiscoveryJobs(jobs: DiscoveryJob[]): Promise<(string | undefined)[]> {
    return Promise.all(
      jobs.map(async (r) => {
        console.log(`Queueing repository ${JSON.stringify(r, null, 4)}`);
        const request: AWS.SQS.SendMessageRequest = {
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(r),
        };
        const sqsMessage = await this.sqsClient.sendMessage(request).promise();
        return sqsMessage.MessageId;
      }),
    );
  }
}
