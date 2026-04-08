export type AuthResponse = {
  token: string;
  username: string;
};

export type AuthRequest = {
  username: string;
  password: string;
};
