from aws_cdk import (
    CfnOutput,
    Stack,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
)

from constructs import Construct

from conf import settings
class BaldinAPIStack(Stack):
    def __init__(self, scope: Construct, id: str, vpc, **kwargs) -> None:
        kwargs["stack_name"] = "BaldinAPIStack"
        kwargs["description"] = "Baldin API Stack with ECS and Fargate"
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

        self.container = self.task_definition.add_container(
            "BaldinAPIContainer",
            image=ecs.ContainerImage.from_asset(settings.BALDIN_API_IMAGE_FILE),
            memory_limit_mib=512,
            cpu=256,
            environment={k: v for k, v in settings.BALDIN_API_IMAGE_ENV.items() if v is not None} # or just # type: ignore this line
        )
        self.container.add_port_mappings(
            ecs.PortMapping(container_port=8000)
        )

        # Create a Fargate Service
        self.service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self, "BaldinAPIFargateService",
            cluster=self.cluster,
            task_definition=self.task_definition,
            desired_count=2,  # Number of tasks
            listener_port=80,
            public_load_balancer=True
        )

        # Output the DNS where the service can be accessed
        CfnOutput(
            self, "BaldinAPILoadBalancerDNS",
            value=self.service.load_balancer.load_balancer_dns_name
        )
