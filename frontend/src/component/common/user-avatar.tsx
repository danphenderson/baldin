import React, { useState } from 'react';
import { Avatar, type AvatarProps } from '@mui/material';
import { avatarUrl } from '../../service/users';
import { userInitials as getUserInitials } from '../../util/format';

export interface UserAvatarProps extends Omit<AvatarProps, 'src' | 'children'> {
  userId?: string | null;
  avatarUri?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  avatarUri,
  firstName,
  lastName,
  email,
  ...rest
}) => {
  const [imgError, setImgError] = useState(false);
  const src = imgError ? undefined : avatarUrl(userId, avatarUri);
  const initials = getUserInitials(firstName, lastName, email);

  return (
    <Avatar
      src={src}
      slotProps={{
        img: {
          loading: 'lazy' as const,
          onError: () => setImgError(true),
        },
      }}
      {...rest}
    >
      {initials}
    </Avatar>
  );
};

export default UserAvatar;
