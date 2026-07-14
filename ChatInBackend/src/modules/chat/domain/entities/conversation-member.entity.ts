export type ConversationMemberRole = 'admin' | 'member';

export type ConversationMemberProps = {
  id?: string;
  conversationId: string;
  userId: string;
  displayName: string;
  role?: ConversationMemberRole;
  joinedAt?: Date;
  pinnedAt?: Date | null;
  mutedUntil?: Date | null;
  lastReadAt?: Date | null;
  deletedAt?: Date | null;
};

export class ConversationMemberEntity {
  private readonly _id?: string;
  private readonly _conversationId!: string;
  private readonly _userId!: string;
  private readonly _displayName!: string;
  private readonly _role!: ConversationMemberRole;
  private readonly _joinedAt!: Date;
  private readonly _pinnedAt!: Date | null;
  private readonly _mutedUntil!: Date | null;
  private readonly _lastReadAt!: Date | null;
  private readonly _deletedAt!: Date | null;

  public constructor(props: ConversationMemberProps) {
    this._id = props.id;
    this._conversationId = props.conversationId;
    this._userId = props.userId;
    this._displayName = props.displayName.trim();
    this._role = props.role ?? 'member';
    this._joinedAt = props.joinedAt ?? new Date();
    this._pinnedAt = props.pinnedAt ?? null;
    this._mutedUntil = props.mutedUntil ?? null;
    this._lastReadAt = props.lastReadAt ?? null;
    this._deletedAt = props.deletedAt ?? null;
  }

  public get id() {
    return this._id;
  }
  public get conversationId() {
    return this._conversationId;
  }
  public get userId() {
    return this._userId;
  }
  public get displayName() {
    return this._displayName;
  }
  public get role() {
    return this._role;
  }
  public get joinedAt() {
    return this._joinedAt;
  }
  public get pinnedAt() {
    return this._pinnedAt;
  }
  public get mutedUntil() {
    return this._mutedUntil;
  }
  public get lastReadAt() {
    return this._lastReadAt;
  }
  public get deletedAt() {
    return this._deletedAt;
  }
}
