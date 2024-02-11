from aws_cdk import Stack, CfnOutput
from constructs import Construct
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_secretsmanager as secretsmanager
from aws_cdk import aws_iam as iam
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_ec2 as ec2

from conf import settings

class ETLStack(Stack):
    """ETL service operating on the baldin-data-lake-<Account-ID> s3 bucket.

    The stack creates a rotating proxy & ip address service to scrape data from
    the web and store it in the data lake.
    """

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Define a task definition
        task_definition = ecs.FargateTaskDefinition(
            self, "ETLTaskDef",
            memory_limit_mib=512,
            cpu=256,
        )

        # Perform lookups for the data lake bucket and the VPC
        data_lake_bucket = s3.Bucket.from_bucket_name(self, "DataLakeBucket", "baldin-data-lake-<Account-ID>")
        vpc = ec2.Vpc.from_lookup(self, "BaldinVPC", vpc_id="BaldinVPC")

        # Add container to the task definition
        container = task_definition.add_container(
            "RotatingProxyService",
            # Use your container image
            image=ecs.ContainerImage.from_registry(settings.ETL_IMAGE_URI),
            environment={
                "SOME_ENV_VAR": "value"
            },
            # Example for using secrets
            secrets={
                "API_KEY": ecs.Secret.from_secrets_manager(secretsmanager.Secret.from_secret_name_v2(self, "ApiKey", "api_key_name"))
            }
        )

        # Create Fargate Service
        task_definition.add_to_task_role_policy(iam.PolicyStatement(
            actions=["s3:*"],
            resources=[data_lake_bucket.bucket_arn, f"{data_lake_bucket.bucket_arn}/*"],
        ))

        self.ecs_cluster = ecs.Cluster(
            self, "BaldinEcsCluster",
            vpc=vpc  # Assuming you have a reference to the VPC object
        )


        fargate_service = ecs.FargateService(
            self, "ETLService",
            cluster=self.ecs_cluster,
            task_definition=task_definition,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_NAT),
        )

        CfnOutput(self, "EcsClusterName", value=self.ecs_cluster.cluster_name)
        CfnOutput(self, "FargateServiceName", value=fargate_service.service_name)
