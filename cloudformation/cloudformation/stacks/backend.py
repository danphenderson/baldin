import secrets
from aws_cdk import Stack
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_ecs_patterns as ecs_patterns

from constructs import Construct
from conf import settings

class BackendStack(Stack):

    def __init__(self, image_uri, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Add a Fargate service running the FastAPI application with a load balancer.
        # Ensure the FastAPI application is running in a private subnet, but the load balancer is in a public subnet.
        vpc = ec2.Vpc.from_lookup(self, "BaldinVPC", vpc_id="BaldinVPC")
        cluster = ecs.Cluster(self, "BaldinCluster", vpc=vpc)
        ecs_patterns.ApplicationLoadBalancedFargateService(
            self, "BaldinService",
            cluster=cluster,
            cpu=256,
            memory_limit_mib=512,
            task_image_options={
                "image": ecs.ContainerImage.from_registry(settings.API_IMAGE_URI),
                "environment": {
                    "SECRET": secrets.token_urlsafe(32)
                }
            },
            public_load_balancer=True
        )
