import * as cdk from "@aws-cdk/core";
import * as chatbot from '@aws-cdk/aws-chatbot';
import * as ssm from '@aws-cdk/aws-ssm';
import { BuildOperationsDetails } from "./buildOperationsDetails";
import { IPipeline } from "@aws-cdk/aws-codepipeline";

export class Notification extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: BuildOperationsDetails, pipeline: IPipeline) {
        super(scope, id);
        
        let slackChannelName = 'sphinx-env-';
        if(props.githubRepositoryBranch === 'master' || props.githubRepositoryBranch.startsWith('bumastemra-uat')){
            slackChannelName += props.githubRepositoryBranch;
        } else {
            slackChannelName += 'other';
        }

        let slackChannelId = ssm.StringParameter.valueForSecureStringParameter(scope, slackChannelName, 1);

        new chatbot.CfnSlackChannelConfiguration(this, props.projectName + 'SlackChannelConfiguration', {
            loggingLevel: 'INFO',
            configurationName: props.projectName + 'CodePipelineStateChangesConfiguration',
            iamRoleArn: props.buildAsRoleArn,
            slackChannelId: slackChannelId,
            slackWorkspaceId: 'T5J1W20JV',
          });
    }
}