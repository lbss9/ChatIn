export type UserBadge = {
  code: string;
  awardedAt: Date;
};

export type UserProps = {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  bio?: string;
  coverUrl?: string;
  coverPosition?: string;
  badges?: Array<string | UserBadge>;
  email: string;
  passwordHash: string;
  refreshTokenHashes?: string[];
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
};

export class UserEntity {
  private readonly _id?: string;
  private _name!: string;
  private _nickname?: string;
  private _bio?: string;
  private _coverUrl?: string;
  private _coverPosition!: string;
  private _badges!: UserBadge[];
  private _email!: string;
  private _passwordHash!: string;
  private _refreshTokenHashes!: string[];
  private _passwordResetTokenHash?: string;
  private _passwordResetExpiresAt?: Date;

  public constructor(props: UserProps) {
    this._id = props.id;
    this._name = (props.name ?? `${props.firstName ?? ''} ${props.lastName ?? ''}`).trim();
    this._nickname = props.nickname?.trim() || undefined;
    this._bio = props.bio?.trim() || undefined;
    this._coverUrl = props.coverUrl?.trim() || undefined;
    this._coverPosition = props.coverPosition?.trim() || 'center center';
    this._badges = (props.badges ?? []).map((badge) => (typeof badge === 'string' ? { code: badge, awardedAt: new Date() } : badge));
    this._email = props.email.trim().toLowerCase();
    this._passwordHash = props.passwordHash;
    this._refreshTokenHashes = props.refreshTokenHashes ?? [];
    this._passwordResetTokenHash = props.passwordResetTokenHash;
    this._passwordResetExpiresAt = props.passwordResetExpiresAt;
  }

  public get id() {
    return this._id;
  }

  public get firstName() {
    return this._name.split(/\s+/)[0] ?? '';
  }

  public get lastName() {
    return this._name.split(/\s+/).slice(1).join(' ');
  }

  public get name() {
    return this._name;
  }
  public get nickname() {
    return this._nickname;
  }
  public get bio() {
    return this._bio;
  }
  public get coverUrl() {
    return this._coverUrl;
  }
  public get coverPosition() {
    return this._coverPosition;
  }
  public get badges() {
    return this._badges.map((badge) => ({ ...badge }));
  }

  public get email() {
    return this._email;
  }

  public get passwordHash() {
    return this._passwordHash;
  }

  public get refreshTokenHashes() {
    return [...this._refreshTokenHashes];
  }

  public get passwordResetTokenHash() {
    return this._passwordResetTokenHash;
  }

  public get passwordResetExpiresAt() {
    return this._passwordResetExpiresAt;
  }

  public addRefreshTokenHash(hash: string) {
    this._refreshTokenHashes = [...this._refreshTokenHashes, hash].slice(-5);
  }

  public removeRefreshTokenHashes(matchingIndexes: number[]) {
    const indexes = new Set(matchingIndexes);
    this._refreshTokenHashes = this._refreshTokenHashes.filter((_, index) => !indexes.has(index));
  }

  public startPasswordReset(tokenHash: string, expiresAt: Date) {
    this._passwordResetTokenHash = tokenHash;
    this._passwordResetExpiresAt = expiresAt;
  }

  public resetPassword(passwordHash: string) {
    this._passwordHash = passwordHash;
    this._refreshTokenHashes = [];
    this._passwordResetTokenHash = undefined;
    this._passwordResetExpiresAt = undefined;
  }

  public clearRefreshTokens() {
    this._refreshTokenHashes = [];
  }

  public updateEmail(email: string) {
    this._email = email.trim().toLowerCase();
  }

  public updateProfile(input: { name?: string; nickname?: string; bio?: string; coverUrl?: string; coverPosition?: string; badges?: UserBadge[] }) {
    if (input.name !== undefined) this._name = input.name.trim();
    if (input.nickname !== undefined) this._nickname = input.nickname.trim() || undefined;
    if (input.bio !== undefined) this._bio = input.bio.trim() || undefined;
    if (input.coverUrl !== undefined) this._coverUrl = input.coverUrl.trim() || undefined;
    if (input.coverPosition !== undefined) this._coverPosition = input.coverPosition.trim() || 'center center';
    if (input.badges !== undefined) this._badges = input.badges;
  }
}
