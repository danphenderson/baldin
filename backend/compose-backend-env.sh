UNSET_SENTINEL="${UNSET_SENTINEL:-__BALDIN_ENV_UNSET__}"

apply_host_override() {
  target_var="$1"
  host_var="HOST_${target_var}"

  if ! eval "[ \"\${$host_var+x}\" = x ]"; then
    return
  fi

  eval "host_value=\${$host_var}"

  if [ "$host_value" = "$UNSET_SENTINEL" ]; then
    unset "$host_var"
    return
  fi

  export "$target_var=$host_value"
  unset "$host_var"
}

apply_backend_host_overrides() {
  apply_host_override OPENAI_API_KEY
  apply_host_override LINKEDIN_USERNAME
  apply_host_override LINKEDIN_PASSWORD
  apply_host_override GLASSDOOR_USERNAME
  apply_host_override GLASSDOOR_PASSWORD
  apply_host_override SENTRY_DSN
  apply_host_override SENTRY_TRACES_SAMPLE_RATE
}
