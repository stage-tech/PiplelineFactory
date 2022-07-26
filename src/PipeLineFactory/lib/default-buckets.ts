import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from 'constructs';

export interface DefaultBucketsProps {
  existingBucketName?: string;
  buildRole : iam.Role;
  kmsEncryptionKey: kms.Key;
}

export default class DefaultBuckets extends Construct {
  transientArtifactsBucket: s3.Bucket;
  artifactsBucket: s3.IBucket;
  constructor(scope: Construct, id: string, props: DefaultBucketsProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    this.transientArtifactsBucket = new s3.Bucket(this, "transientBucket", {
      bucketName: `${stack.stackName.toLowerCase()}-${stack.account}-${
        stack.region
      }-transient`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryptionKey: props.kmsEncryptionKey,
      encryption: s3.BucketEncryption.KMS,
    });

    new ssm.StringParameter(this, "transientArtifactsBucketSsm", {
      parameterName: `/${stack.stackName.toLowerCase()}/transientArtifactsBucket`,
      stringValue: this.transientArtifactsBucket.bucketName,
    });

    if (props.existingBucketName) {
      this.artifactsBucket = s3.Bucket.fromBucketName(
        this,
        "existingArtifactsBucket",
        props.existingBucketName
      );
    } else {
      this.artifactsBucket = new s3.Bucket(this, "artifactsBucket", {
        bucketName: `${stack.stackName.toLowerCase()}-${stack.account}-${
          stack.region
        }-artifacts`,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        encryptionKey: props.kmsEncryptionKey,
        encryption: s3.BucketEncryption.KMS,
      });
    }
    new ssm.StringParameter(this, "artifactsBucketSsm", {
      parameterName: `/${stack.stackName.toLowerCase()}/artifactsBucket`,
      stringValue: this.artifactsBucket.bucketName,
    });
  }
}
