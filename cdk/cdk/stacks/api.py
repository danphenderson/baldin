from aws_cdk import (
    CfnOutput,
    Stack,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_logs as logs,
    aws_ecr as ecr,
    aws_ec2 as ec2,
    aws_secretsmanager as secretsmanager
)

from constructs import Construct

from conf import settings
from utils import build_and_push_docker_image

def build_and_push_image(image_tag: str):
    """
    TODO: Figure out why this function isn't reporting progress to the console.

    It takes for ever to run and doesn't show any output until it's done.
    """
    # Build and push the Docker image to ECR
    repository_name = "baldin-api-repository"
    build_and_push_docker_image(repository_name, settings.BALDIN_API_PATH, image_tag)


class BaldinAPIStack(Stack):
    def __init__(self, scope: Construct, id: str, vpc, db, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Load the image environment variables
        env_dict = {k: v for k, v in settings.BALDIN_API_IMAGE_ENV.items() if v is not None}

        # Create an ECS cluster
        self.cluster = ecs.Cluster(
            self, "BaldinAPICluster",
            vpc=vpc
        )

        # Define task definition with a single container
        self.task_definition = ecs.FargateTaskDefinition(
            self, "BaldinAPITaskDef"
        )

        # Fetch the database credentials secret
        db_credentials_secret = secretsmanager.Secret.from_secret_complete_arn(
            self, "BaldinDBCredentialsSecret",
            db.secret.secret_arn
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
            environment={  # Non-sensitive env vars
                "ENV_VAR_NAME": "value"
            },
            secrets={
                "DATABASE_USERNAME": ecs.Secret.from_secrets_manager(db_credentials_secret, "username"),
                "DATABASE_PASSWORD": ecs.Secret.from_secrets_manager(db_credentials_secret, "password")
            },
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix="BaldinAPI",
                log_retention=logs.RetentionDays.ONE_MONTH
            ),
        )


        self.container.add_port_mappings(
            ecs.PortMapping(container_port=8000)
        )

        # Define a security group for your ECS service
        ecs_security_group = ec2.SecurityGroup(
            self, "BaldinAPIServiceSG",
            vpc=vpc,
            description="Security group for the ECS service",
            allow_all_outbound=True  # Modify as necessary for your use case
        )



        # Define a security group for your ECS service
        ecs_security_group = ec2.SecurityGroup(
            self, "BaldinAPIServiceSG",
            vpc=vpc,
            description="Security group for the ECS service",
            allow_all_outbound=True  # Modify as necessary for your use case
        )

        # Allow inbound HTTP traffic on port 80
        ecs_security_group.add_ingress_rule(
            ec2.Peer.any_ipv4(),
            ec2.Port.tcp(80),
            "Allow inbound HTTP traffic"
        )


        # Create the fargate service
        self.service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self, "BaldinAPIFargateService",
            cluster=self.cluster,
            task_definition=self.task_definition,
            security_groups=[ecs_security_group],
            desired_count=2,
            listener_port=80,
            public_load_balancer=True
        )
        # Output the DNS where the service can be accessed
        CfnOutput(
            self, "BaldinAPILoadBalancerDNS",
            value=self.service.load_balancer.load_balancer_dns_name
        )
