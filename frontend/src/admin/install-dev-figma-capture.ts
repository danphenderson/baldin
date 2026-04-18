const FIGMA_CAPTURE_SCRIPT_ID = 'baldin-dev-figma-capture';
const FIGMA_CAPTURE_SCRIPT_SRC = 'https://mcp.figma.com/mcp/html-to-design/capture.js';

export function installDevFigmaCaptureScript(): void {
  if (!import.meta.env.DEV || typeof document === 'undefined') {
    return;
  }

  if (document.getElementById(FIGMA_CAPTURE_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement('script');
  script.id = FIGMA_CAPTURE_SCRIPT_ID;
  script.src = FIGMA_CAPTURE_SCRIPT_SRC;
  script.async = true;
  document.head.append(script);
}
