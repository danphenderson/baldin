from aws_cdk import (
    CfnOutput,
    Stack,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_logs as logs,
    aws_ecr as ecr
)

from constructs import Construct

from conf import settings
from utils import build_and_push_docker_image

def build_and_push_image(image_tag: str):
    # Build and push the Docker image to ECR
    repository_name = "baldin-api-repository"
    build_and_push_docker_image(repository_name, settings.BALDIN_API_PATH, image_tag)


class BaldinAPIStack(Stack):
    def __init__(self, scope: Construct, id: str, vpc, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Assume VPC is passed from another stack or defined here
        self.vpc = vpc

        # Create an ECS cluster
        self.cluster = ecs.Cluster(
            self, "BaldinAPICluster",
            vpc=self.vpc
        )

        # Define task definition with a single container
        self.task_definition = ecs.FargateTaskDefinition(
            self, "BaldinAPITaskDef"
        )

        # Setup CloudWatch Logs
        self.container = self.task_definition.add_container(
            "BaldinAPIContainer",
            # Use an image from ECR
            image=ecs.ContainerImage.from_ecr_repository(
                ecr.Repository.from_repository_name(self, "BaldinAPIRepo", "baldin-api-repository"),
                "latest"
            ),
            memory_limit_mib=512,
            cpu=256,
            environment={k: v for k, v in settings.BALDIN_API_IMAGE_ENV.items() if v is not None},
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix="BaldinAPI",
                log_retention=logs.RetentionDays.ONE_MONTH
            ),
        )

        self.container.add_port_mappings(
            ecs.PortMapping(container_port=8000)
        )

        # Create a Fargate Service
        self.service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self, "BaldinAPIFargateService",
            cluster=self.cluster,
            task_definition=self.task_definition,
            desired_count=2,
            listener_port=80,
            public_load_balancer=True
        )

        # Output the DNS where the service can be accessed
        CfnOutput(
            self, "BaldinAPILoadBalancerDNS",
            value=self.service.load_balancer.load_balancer_dns_name
        )
