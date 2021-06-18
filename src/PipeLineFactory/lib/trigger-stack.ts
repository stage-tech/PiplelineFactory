import * as cdk from "@aws-cdk/core";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import FactoryProperties from "./factoryProperties";
import Factory from "./factory";
import Notifications from "./notifications/notifications";
import Api from "./api";
import * as kms from "@aws-cdk/aws-kms";
import * as iam from "@aws-cdk/aws-iam";
import DefaultBuildAsRole from "./default-build-as-role";
import DefaultBuckets from "./default-buckets";
import { Monitor } from "./monitor/monitor";

export class TriggerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: FactoryProperties) {
    super(scope, id, props);

    cdk.Tags.of(this).add("service", "pipeline-factory");

    new secretsmanager.Secret(this, "defaultGitHubSecret", {
      secretName: `/${this.stackName.toLowerCase()}/default-github-token`,
    });

    const buildRole = new DefaultBuildAsRole(this, "DefaultBuildAdAsRole").role;

    const kmsEncryptionKey = new kms.Key(this, "KmsEncryptionKey", {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    kmsEncryptionKey.grantEncryptDecrypt(
      new iam.ArnPrincipal(buildRole.roleArn)
    );

    new DefaultBuckets(this, "defaultBuckets" , {
      existingBucketName : props.existingBucketName,
      buildRole,
      kmsEncryptionKey
    });

    const factory = new Factory(this, "factoryBuilder", props);

    new Api(this, "Api", {
      PipelineFactoryBuildProjectName: factory.buildProjectName,
      apiDomainCertificateArn: props.apiDomainCertificateArn,
      apiDomainName: props.apiDomainName,
      triggerCodeS3Bucket: props.triggerCodeS3Bucket,
      triggerCodeS3Key: props.triggerCodeS3Key,

    });

    new Notifications(this, "PipelineNotifications", {
      triggerCodeS3Bucket: props.triggerCodeS3Bucket,
      triggerCodeS3Key: props.triggerCodeS3Key,
      organizationName: props.organizationName,
      kmsEncryptionKey
    });
  
 
    new Monitor(this , "Monitor", {
      triggerCodeS3Bucket : props.triggerCodeS3Bucket,
      triggerCodeS3Key: props.triggerCodeS3Key,
      PipelineFactoryBuildProjectName : factory.buildProjectName,
      organizationName : props.organizationName,
      repositorySelector : props.repositorySelector
    })
  }
}
