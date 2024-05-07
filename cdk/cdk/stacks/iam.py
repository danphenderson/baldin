import json

from aws_cdk import (
    Stack,
    aws_iam as iam,
    aws_secretsmanager as secretsmanager
)
from constructs import Construct

class BaldinIAMStack(Stack):
    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create IAM user for GitHub Actions
        github_user = iam.User(self, "GitHubActionsUser", user_name="github-actions-user")

        # Attach policy to allow ECR actions
        ecr_policy = iam.PolicyStatement(
            actions=[
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:CompleteLayerUpload",
                "ecr:InitiateLayerUpload",
                "ecr:PutImage",
                "ecr:UploadLayerPart"
            ],
            resources=["*"],  # It's recommended to specify the exact resource ARN if possible
            effect=iam.Effect.ALLOW
        )
        github_user.add_to_policy(ecr_policy)

        # Attach policy to allow ECS actions
        ecs_policy = iam.PolicyStatement(
            actions=[
                "ecs:RegisterTaskDefinition",
                "ecs:DeregisterTaskDefinition",
                "ecs:DescribeTaskDefinition",
                "ecs:ListTaskDefinitions",
                "ecs:UpdateService",
                "ecs:DescribeServices",
                "ecs:ListClusters",
                "ecs:DescribeClusters",
                "ecs:ListServices"
            ],
            resources=["*"],  # Specify resources as narrowly as possible in production
            effect=iam.Effect.ALLOW
        )
        github_user.add_to_policy(ecs_policy)

        # Create access keys for GitHub Actions user
        access_key = iam.AccessKey(self, "GitHubUserAccessKey", user=github_user)


        # Create a new secret for the GitHub Actions user access key
        github_actions_user_secret = secretsmanager.Secret(self, "GitHubActionsUserSecret",
            secret_name="github-actions/user-access-key",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template=json.dumps({
                    "accessKeyId": access_key.access_key_id
                }),
                generate_string_key="secretAccessKey"
            )
        )


        # Output the access key and secret key to be added to GitHub secrets
        # CfnOutput(self, "AccessKeyId", value=access_key.access_key_id)
        # CfnOutput(self, "SecretAccessKey", value=access_key.secret_access_key.to_string())
