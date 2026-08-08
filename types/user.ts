export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  /** Google ID token expiry in seconds since epoch (0 = unknown). */
  exp: number;
}
