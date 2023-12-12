import React from 'react';
import { useNavigate } from 'react-router-dom';
import { List, ListItem, IconButton, ListItemIcon, ListItemText } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LeadsIcon from '@mui/icons-material/Leaderboard'; // Placeholder icon
import ApplicationsIcon from '@mui/icons-material/Apps'; // Placeholder icon
import EtlIcon from '@mui/icons-material/Transform'; // Placeholder icon

const Navigator: React.FC = () => {
  const navigate = useNavigate();

  return (
    <List>
      <ListItem button onClick={() => navigate('/settings')}>
        <ListItemIcon>
          <SettingsIcon />
        </ListItemIcon>
        <ListItemText primary="Settings" />
      </ListItem>
      <ListItem button onClick={() => navigate('/leads')}>
        <ListItemIcon>
          <LeadsIcon />
        </ListItemIcon>
        <ListItemText primary="Leads" />
      </ListItem>
      <ListItem button onClick={() => navigate('/applications')}>
        <ListItemIcon>
          <ApplicationsIcon />
        </ListItemIcon>
        <ListItemText primary="Applications" />
      </ListItem>
      <ListItem button onClick={() => navigate('/data-orchestration')}>
        <ListItemIcon>
          <EtlIcon />
        </ListItemIcon>
        <ListItemText primary="ETL" />
      </ListItem>
    </List>
  );
};

export default Navigator;
