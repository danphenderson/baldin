from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import UUID4, AnyHttpUrl, BaseModel, ConfigDict, Field, model_validator


class ETLServiceBaseModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        protected_namespaces=(),
    )


class CrawlerExecutionTerminalStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"


class ProxyExecutionPolicy(ETLServiceBaseModel):
    mode: Literal["direct", "managed"] = "direct"
    upstream_base_url: AnyHttpUrl | None = None
    auth_header_env: str | None = None

    @model_validator(mode="after")
    def validate_managed_proxy(self) -> "ProxyExecutionPolicy":
        if self.mode == "managed" and self.upstream_base_url is None:
            raise ValueError(
                "execution_policy.proxy.upstream_base_url is required in managed mode"
            )
        return self


class CrawlerExecutionPolicy(ETLServiceBaseModel):
    model_config = ConfigDict(
        extra="allow",
        protected_namespaces=(),
    )

    headless: bool = True
    proxy: ProxyExecutionPolicy | None = None


class CrawlRunExecuteRequest(ETLServiceBaseModel):
    run_id: UUID4
    source: Literal["linkedin", "glassdoor"]
    query_definition: dict[str, Any] = Field(default_factory=dict)
    execution_policy: CrawlerExecutionPolicy | None = None
    correlation_id: str | None = None
    schedule_definition: dict[str, Any] | None = None
    trigger_type: str | None = None


class CrawlResult(ETLServiceBaseModel):
    url: str
    title: str | None = None
    description: str | None = None
    location: str | None = None
    salary: str | None = None
    job_function: str | None = None
    employment_type: str | None = None
    seniority_level: str | None = None
    education_level: str | None = None
    company_name: str | None = None


class CrawlRunExecuteResponse(ETLServiceBaseModel):
    terminal_status: CrawlerExecutionTerminalStatus
    results: list[CrawlResult] = Field(default_factory=list)
    stats: dict[str, int] = Field(default_factory=dict)
    error_summary: str | None = None
    warnings: list[str] = Field(default_factory=list)
