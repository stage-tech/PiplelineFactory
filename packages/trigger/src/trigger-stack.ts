import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cdkConstants from 'cdk-constants';

import Api from './api';
import { CodeConnections } from './codeconnections/codeconnections';
import DefaultBuckets from './default-buckets';
import DefaultBuildAsRole from './default-build-as-role';
import Factory from './factory';
import FactoryProperties from './factoryProperties';
import { Monitor } from './monitor/monitor';
import Notifications from './notifications/notifications';

export class TriggerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: FactoryProperties) {
    super(scope, id, props);

    cdk.Tags.of(this).add('service', 'pipeline-factory');

    new secretsmanager.Secret(this, 'defaultGitHubSecret', {
      secretName: `/${this.stackName.toLowerCase()}/default-github-token`,
    });

    const buildRole = new DefaultBuildAsRole(this, 'DefaultBuildAdAsRole').role;

    const kmsEncryptionKey = new kms.Key(this, 'KmsEncryptionKey', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    kmsEncryptionKey.grantEncryptDecrypt(new iam.ArnPrincipal(buildRole.roleArn));
    kmsEncryptionKey.grantEncryptDecrypt(new iam.ServicePrincipal(cdkConstants.ServicePrincipals.EVENTS));
    kmsEncryptionKey.grantEncryptDecrypt(new iam.ServicePrincipal(cdkConstants.ServicePrincipals.SNS));

    new DefaultBuckets(this, 'defaultBuckets', {
      existingBucketName: props.existingBucketName,
      buildRole,
      kmsEncryptionKey,
    });

    const factory = new Factory(this, 'factoryBuilder', props);

    new Api(this, 'Api', {
      PipelineFactoryBuildProjectName: factory.buildProjectName,
      lambdaCodeEntryPoint: props.lambdaCodeEntryPoint,
      githubToken: props.githubToken,
    });
    /*
   
    new Monitor(this, 'Monitor', {
      PipelineFactoryBuildProjectName: factory.buildProjectName,
      organizationName: props.organizationName,
      repositorySelector: props.repositorySelector,
      lambdaCodeEntryPoint: props.lambdaCodeEntryPoint,
      githubToken: props.githubToken,
    });
    */
    new Notifications(this, 'PipelineNotifications', {
      organizationName: props.organizationName,
      kmsEncryptionKey,
      lambdaCodeEntryPoint: props.lambdaCodeEntryPoint,
      githubToken: props.githubToken,
    });

    new CodeConnections(this, 'CodeConnections');
  }
}
