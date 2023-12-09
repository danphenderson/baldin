import {components} from '../schema.d';

type UserRead = components['schemas']['UserRead'];

export const getUser = async (token: string): Promise<UserRead | null> => {
  if (!token) {
    return null;
  }
  const requestOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token,
    },
  };
  const response = await fetch("/users/me", requestOptions);

  if (!response.ok) {
    return null;
  }
  const userData: UserRead = await response.json();
  return userData;
};
