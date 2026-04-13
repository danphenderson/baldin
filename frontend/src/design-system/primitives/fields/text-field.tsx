import React from 'react';
import {
  InputAdornment,
  TextField,
  type TextFieldProps,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

type TextFieldSlotProps = NonNullable<TextFieldProps['slotProps']>;

function mergeTextFieldSlotProps(
  base: TextFieldProps['slotProps'],
  extra: TextFieldProps['slotProps'],
): TextFieldProps['slotProps'] {
  return {
    ...base,
    ...extra,
    input: {
      ...base?.input,
      ...extra?.input,
    },
    htmlInput: {
      ...base?.htmlInput,
      ...extra?.htmlInput,
    },
  } satisfies TextFieldProps['slotProps'];
}

export interface SearchFieldProps extends Omit<TextFieldProps, 'InputProps'> {
  slotProps?: TextFieldSlotProps;
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { slotProps, inputRef, ...props },
  ref,
) {
  const mergedSlotProps = mergeTextFieldSlotProps({
    input: {
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon sx={{ color: 'text.secondary' }} />
        </InputAdornment>
      ),
    },
  }, slotProps);

  return <TextField {...props} inputRef={inputRef ?? ref} slotProps={mergedSlotProps} />;
});

export interface ReadonlyFieldProps extends Omit<TextFieldProps, 'InputProps'> {
  slotProps?: TextFieldSlotProps;
}

export const ReadonlyField = React.forwardRef<HTMLInputElement, ReadonlyFieldProps>(function ReadonlyField(
  { slotProps, inputRef, ...props },
  ref,
) {
  const mergedSlotProps = mergeTextFieldSlotProps(slotProps, {
    input: {
      readOnly: true,
    },
  });

  return <TextField {...props} inputRef={inputRef ?? ref} slotProps={mergedSlotProps} />;
});
