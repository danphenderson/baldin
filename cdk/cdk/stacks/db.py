from aws_cdk import (
    CfnOutput,
    Duration,
    Stack,
    aws_rds as rds,
    aws_ec2 as ec2,
    aws_secretsmanager as secretsmanager
)
from constructs import Construct

class BaldinDBStack(Stack):
    def __init__(self, scope: Construct, id: str, vpc, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Security Group for the RDS instance
        security_group = ec2.SecurityGroup(
            self, "DBSecurityGroup",
            vpc=vpc,
            description="Allow access to RDS from the application",
            allow_all_outbound=True
        )
        security_group.add_ingress_rule(
            ec2.Peer.any_ipv4(),
            ec2.Port.tcp(5432),
            "Allow PostgreSQL access"
        )

        # Define the subnet selection for the database
        subnet_selection = ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS)
        db_instance = rds.DatabaseInstance(
            self, "DBInstance",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_13_3
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ),
            security_groups=[security_group],
            multi_az=False,
            allocated_storage=20,
            max_allocated_storage=100,
            backup_retention=Duration.days(7),
            delete_automated_backups=True,
            deletion_protection=False,
            storage_encrypted=True,
            database_name="db",
            credentials=rds.Credentials.from_generated_secret("postgres")
        )

        # Output the secrets manager secret
        CfnOutput(
            self, "DBCredentials",
            value=db_instance.secret.secret_arn, # type: ignore
            description="ARN of the RDS instance credentials in Secrets Manager"
        )
