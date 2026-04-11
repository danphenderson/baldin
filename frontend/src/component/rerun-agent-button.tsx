import React, { useContext, useEffect, useState } from 'react';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import { SmartToyOutlined as AgentIcon } from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import { getRunsBySessionDocument, runAgent } from '../service/agents';
import type { AgentRunSummaryRead } from '../service/agents';

export interface RerunAgentButtonProps {
  documentId: string;
  onRerunComplete?: (sessionDocumentId: string) => void;
}

const RerunAgentButton: React.FC<RerunAgentButtonProps> = ({
  documentId,
  onRerunComplete,
}) => {
  const { token } = useContext(UserContext);
  const { notify } = useNotification();

  const [latestRun, setLatestRun] = useState<AgentRunSummaryRead | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token || !documentId) return;
      try {
        const result = await getRunsBySessionDocument(token, documentId, { page: 1, page_size: 1 });
        if (!cancelled && result.items.length > 0) {
          setLatestRun(result.items[0]);
        }
      } catch {
        /* non-blocking — hide button if lookup fails */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token, documentId]);

  const handleRerun = async () => {
    if (!token || !latestRun || !latestRun.application_id) return;
    setLaunching(true);
    try {
      const result = await runAgent(token, latestRun.agent_id, {
        application_id: latestRun.application_id,
        session_document_id: documentId,
      });
      notify('Agent rerun completed — new version created');
      if (onRerunComplete && result.session_document_id) {
        onRerunComplete(result.session_document_id);
      }
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Agent rerun failed', 'error');
    } finally {
      setLaunching(false);
    }
  };

  if (!loaded || !latestRun || latestRun.status !== 'completed' || !latestRun.application_id) {
    return null;
  }

  return (
    <Tooltip title="Rerun the agent that created this session to generate a new version">
      <Button
        variant="outlined"
        size="small"
        onClick={handleRerun}
        disabled={launching}
        startIcon={
          launching
            ? <CircularProgress size={16} color="inherit" />
            : <AgentIcon />
        }
        sx={{ whiteSpace: 'nowrap' }}
      >
        {launching ? 'Rerunning…' : 'Rerun Agent'}
      </Button>
    </Tooltip>
  );
};

export default RerunAgentButton;
