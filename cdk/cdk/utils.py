from pathlib import Path

def build_and_push_docker_image(repository_name: str, build_path: Path, image_tag: str="latest"):
    raise RuntimeError(
        "Public ECR promotion is disabled. Build candidate images in the public repo "
        "and promote them from the private deployment control plane instead."
    )
