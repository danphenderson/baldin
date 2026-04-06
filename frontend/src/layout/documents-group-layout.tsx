import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Thin route-group wrapper for /documents/*.
 *
 * Secondary nav is rendered by AppLayout based on pathname — this layout
 * exists solely as a React Router nesting point for document sub-routes.
 */
const DocumentsGroupLayout: React.FC = () => <Outlet />;

export default DocumentsGroupLayout;
