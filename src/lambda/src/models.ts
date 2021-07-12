export class SettingsOverrides {
  gitHubTokenSecretArn?: string;
  buildSpecLocation?: string;
  buildAsRoleArn?: string;
  monitoredBranches?: string[];
  notifications?: NotificationSettings[];
}

export class Repository {
  name: string;
  owner: string;
  defaultBranch: string;
  topics: string[];
  repositoryId: string;
  branches: Branch[];
  settings?: SettingsOverrides;
}

export class DiscoveryJob {
  name: string;
  owner: string;
}

export class Branch {
  constructor(public branchName: string, public commitSha: string) {}
  public pipelineStack: StackInformation;
}

export interface PipeLineOperationResult {
  message: string;
  buildArn?: string;
}

export class StackInformation {
  stackName: string;
  repository: string;
  owner: string;
  branchName: string;
  constructor(stack: AWS.CloudFormation.Stack) {
    this.stackName = stack.StackName;
    this.repository = stack.Tags?.find((t) => t.Key == 'repository')?.Value || '';
    this.owner = stack.Tags?.find((t) => t.Key == 'owner')?.Value || '';
    this.branchName = stack.Tags?.find((t) => t.Key == 'branch')?.Value || '';
  }
}

export interface PipelineExecutionEvent {
  'detail-type': string;
  detail: any;
}

export interface PipelineEventDetail {
  pipelineName: string;
  executionId: string;
  state: string;
}

export interface NotificationPayload {
  pipelineName: string;
  pipelineState: string;
  pipelineExecutionId: string;
  commitUrl: string;
  commitMessage: string;
  commitAuthor: string;
  commitDate: string;
  failureLogs?: string;
  failureSummary?: string;
  failurePhase?: string;
}

export interface NotificationSettings {
  branches: string[];
  event: string;
  channelId: string;
  channelType: ChannelType;
}

export interface NotificationTarget {
  channelId: string;
  channelType: ChannelType;
}

export enum ChannelType {
  SLACK = 'SLACK',
}
