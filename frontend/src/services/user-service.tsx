import {components} from '../schema.d';

export type UserRead = components['schemas']['UserRead'];
export type UserUpdate = components['schemas']['UserUpdate'];

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

export const updateUser = async (token: string, user: UserUpdate): Promise<UserRead | null> => {
  if (!token) {
    return null;
  }
  const requestOptions = {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token,
    },
    body: JSON.stringify(user),
  };
  const response = await fetch("/users/me", requestOptions);

  if (!response.ok) {
    return null;
  }
  const userData: UserRead = await response.json();
  return userData;
}
