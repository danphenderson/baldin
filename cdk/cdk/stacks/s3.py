from aws_cdk import Stack, RemovalPolicy, Duration, CfnOutput
from constructs import Construct
from aws_cdk import aws_s3 as s3

from conf import settings

class BaldinS3Stack(Stack):


    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)


        # Create S3 public bucket for static assets
        public_assets_bucket = s3.Bucket(
            self, "PublicStaticAssetsBucket",
            removal_policy=RemovalPolicy.DESTROY,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess(block_public_acls=False, block_public_policy=False, ignore_public_acls=False, restrict_public_buckets=False),  # Correctly configured for public read access
            bucket_name=settings.PUBLIC_STATIC_ASSETS_BUCKET_NAME,
            public_read_access=True
        )
        # Export the bucket name as a stack output
        CfnOutput(self, "PublicStaticAssetsBucketName", value=public_assets_bucket.bucket_name)

        # Create S3 private bucket for data lake using intelligent tiering and encryption
        data_lake_bucket = s3.Bucket(
            self, "DataLakeBucket",
            removal_policy=RemovalPolicy.DESTROY,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            bucket_name=settings.DATALAKE_BUCKET_NAME,
            lifecycle_rules=[
                s3.LifecycleRule(
                    enabled=True,
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INTELLIGENT_TIERING,
                            transition_after=Duration.days(30)
                        )
                    ]
                )
            ]
        )
        # Export the bucket name as a stack output
        CfnOutput(self, "DataLakeBucketName", value=data_lake_bucket.bucket_name)
