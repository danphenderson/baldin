from aws_cdk import (
    CfnOutput,
    Stack,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_logs as logs,
    aws_ecr as ecr,
)

from constructs import Construct

from conf import settings


class BaldinAPIStack(Stack):
    def __init__(self, scope: Construct, id: str, vpc, api_sg, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Import values from dependant parent stacks

        # Create an ECS cluster
        self.cluster = ecs.Cluster(
            self, "BaldinAPICluster",
            vpc=vpc,
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
                tag=settings.BALDIN_API_IMAGE_TAG
            ),
            memory_limit_mib=512,
            cpu=256,
            environment=settings.BALDIN_API_ENV,
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix="BaldinAPI",
                log_retention=logs.RetentionDays.ONE_MONTH
            ),
        )

        # Add port mappings
        self.container.add_port_mappings(
            ecs.PortMapping(container_port=int(settings.BALDIN_API_ENV.get('PORT', "8000")))
        )


        # Create the fargate service
        self.service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self, "BaldinAPIFargateService",
            cluster=self.cluster,
            task_definition=self.task_definition,
            security_groups=[api_sg],
            desired_count=2,
            listener_port=80,
            public_load_balancer=True
        )

        # Output the DNS where the service can be accessed
        CfnOutput(
            self, "BaldinAPILoadBalancerDNS",
            value=self.service.load_balancer.load_balancer_dns_name
        )
