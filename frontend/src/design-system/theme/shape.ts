import type { ShapeOptions } from '@mui/material/styles';
import { radiusTokens } from '../tokens/radius';

export function getShapeOptions(): ShapeOptions {
  return {
    borderRadius: radiusTokens.lg,
  };
}
