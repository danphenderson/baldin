import React from 'react';
import {
  TextField, FormControl, InputLabel, Select, MenuItem, Button, Tooltip,
  InputAdornment, Pagination as MuiPagination,
} from '@mui/material';
import { Search as SearchIcon, Bolt as BoltIcon } from '@mui/icons-material';
import { CollectionToolbar } from '../design-system';

export interface LeadSearchBarProps {
  search: string;
  filter: string;
  page: number;
  pageCount: number;
  rankingActive: boolean;
  rankingPending: boolean;
  rankingDisabledReason?: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRank: () => void;
  onClearRanking: () => void;
}

const LeadSearchBar: React.FC<LeadSearchBarProps> = ({
  search, filter, page, pageCount,
  rankingActive, rankingPending, rankingDisabledReason,
  onSearchChange, onFilterChange, onPageChange,
  onRank, onClearRanking,
}) => (
  <CollectionToolbar
    sx={{ mb: 3 }}
    search={(
      <TextField
        size="small"
        placeholder="Search by title, company, or location..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ flexGrow: 1 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            'aria-label': 'Search leads',
          },
        }}
      />
    )}
    controls={(
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="leads-filter-label">Filter</InputLabel>
        <Select
          labelId="leads-filter-label"
          value={filter}
          label="Filter"
          onChange={(e) => onFilterChange(e.target.value)}
        >
          <MenuItem value="all">All Leads</MenuItem>
          <MenuItem value="registered">I&apos;m Tracking</MenuItem>
          <MenuItem value="active">Active Collaboration</MenuItem>
          <MenuItem value="remote">Remote</MenuItem>
          <MenuItem value="fulltime">Full-time</MenuItem>
        </Select>
      </FormControl>
    )}
    actions={(
      <>
        <Tooltip title={rankingDisabledReason ?? ''} disableHoverListener={!rankingDisabledReason}>
          <span>
            <Button
              variant={rankingActive ? 'outlined' : 'contained'}
              startIcon={<BoltIcon />}
              onClick={onRank}
              disabled={Boolean(rankingDisabledReason) || rankingPending}
            >
              {rankingPending ? 'Ranking...' : 'Rank with aspirations'}
            </Button>
          </span>
        </Tooltip>
        {rankingActive && (
          <Button
            variant="text"
            color="inherit"
            onClick={onClearRanking}
            disabled={rankingPending}
          >
            Clear ranking
          </Button>
        )}
      </>
    )}
    secondary={pageCount > 1 ? (
      <MuiPagination
        count={pageCount}
        page={page}
        onChange={(_, v) => onPageChange(v)}
        size="small"
        shape="rounded"
        sx={{
          '& .MuiPaginationItem-root': { fontWeight: 600 },
          '& .MuiPagination-ul': { flexWrap: 'nowrap' },
        }}
      />
    ) : undefined}
  />
);

export default LeadSearchBar;
