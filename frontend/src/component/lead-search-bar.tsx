import React from 'react';
import {
  TextField, Stack, FormControl, InputLabel, Select, MenuItem,
  InputAdornment, Pagination as MuiPagination,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

export interface LeadSearchBarProps {
  search: string;
  filter: string;
  page: number;
  pageCount: number;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
}

const LeadSearchBar: React.FC<LeadSearchBarProps> = ({
  search, filter, page, pageCount,
  onSearchChange, onFilterChange, onPageChange,
}) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={2}
    sx={{ mb: 3 }}
    alignItems={{ sm: 'center' }}
  >
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
    {pageCount > 1 && (
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
    )}
  </Stack>
);

export default LeadSearchBar;
