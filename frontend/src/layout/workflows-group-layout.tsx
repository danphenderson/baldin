import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Thin route-group wrapper for /workflows/*.
 *
 * Secondary nav is rendered by AppLayout based on pathname — this layout
 * exists solely as a React Router nesting point for workflow sub-routes.
 */
const WorkflowsGroupLayout: React.FC = () => <Outlet />;

export default WorkflowsGroupLayout;
