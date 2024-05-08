import boto3
import subprocess
from pathlib import Path
from conf import settings
from rich import print

def build_and_push_docker_image(repository_name: str, build_path: Path, image_tag: str="latest"):
    """
    Build and push a Docker image to ECR.

    Args:
    - repository_name (str): The name of the ECR repository.
    - build_path (Path): The path to the directory containing the Dockerfile and other build files (context).
    - image_tag (str): The tag to apply to the Docker image. Default is "latest".
    """

    # Create an ECR client
    ecr_client = boto3.client('ecr', region_name=settings.AWS_REGION)

    # Get login command from ECR
    response = ecr_client.get_authorization_token()
    password = response['authorizationData'][0]['authorizationToken']
    proxy_endpoint = response['authorizationData'][0]['proxyEndpoint']

    # Login to Docker ECR registry
    login_command = f"docker login --username AWS --password-stdin {password}"
    subprocess.run(login_command, shell=True, check=True)
    print(f"Logged in to ECR at {proxy_endpoint}")

    # Build the Docker image
    build_command = f"docker build -t {repository_name}:{image_tag} -f {str(build_path / 'Dockerfile.prod')} {build_path}"
    subprocess.run(build_command, shell=True, check=True)
    print(f"Image built with tag {image_tag}")

    # Tag the Docker image for ECR
    ecr_image_uri = f"{settings.AWS_ACCOUNT}.dkr.ecr.{settings.AWS_REGION}.amazonaws.com/{repository_name}:{image_tag}"
    tag_command = f"docker tag {repository_name}:{image_tag} {ecr_image_uri}"
    subprocess.run(tag_command, shell=True, check=True)
    print(f"Image tagged for ECR at {ecr_image_uri}")

    # Push the image to ECR
    push_command = f"docker push {ecr_image_uri}"
    subprocess.run(push_command, shell=True, check=True)
    print(f"Image pushed to ECR at {ecr_image_uri}")
