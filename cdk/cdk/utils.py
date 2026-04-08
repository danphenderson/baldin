from pathlib import Path

def build_and_push_docker_image(repository_name: str, build_path: Path, image_tag: str="latest"):
    raise RuntimeError(
        "Legacy ECR promotion is disabled. Build candidate images in this repository "
        "and promote them only through the approved deployment path."
    )
