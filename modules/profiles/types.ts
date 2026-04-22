export type Profile = {
  id: number;
  userId: number;
  profilePictureUrl: string;
  name: string;
  age: number;
  createdAt: string;
  updatedAt: string;
};

export type ProfileInput = {
  profilePictureUrl: string;
  name: string;
  age: number;
};

export type ProfileRecord = {
  id: bigint;
  userId: bigint;
  profilePictureUrl: string;
  name: string;
  age: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };
