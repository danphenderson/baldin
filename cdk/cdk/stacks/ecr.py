from aws_cdk import Stack, RemovalPolicy, aws_ecr as ecr
from constructs import Construct

class BaldinECRStack(Stack):
    """
    Creates ECR Repository(s) for Baldin Docker images.
    """
    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        # Create the ECR repository
        self.repository = ecr.Repository(
            self, "BaldinAPIRepository",
            repository_name="baldin-api-repository",
            removal_policy=RemovalPolicy.DESTROY  # Automatically delete the repo when the stack is destroyed, if desired
        )

        # Optionally, enable image scanning to check for vulnerabilities on push
        self.repository.add_lifecycle_rule(
            tag_prefix_list=["prod"],
            max_image_count=1,
            description="Keep only one latest prod tagged image"
        )
