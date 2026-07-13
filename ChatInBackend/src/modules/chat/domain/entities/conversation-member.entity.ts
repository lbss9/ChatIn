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
  private readonly _conversationId: string;
  private readonly _userId: string;
  private readonly _displayName: string;
  private readonly _role: ConversationMemberRole;
  private readonly _joinedAt: Date;
  private readonly _pinnedAt: Date | null;
  private readonly _mutedUntil: Date | null;
  private readonly _lastReadAt: Date | null;
  private readonly _deletedAt: Date | null;

  constructor(props: ConversationMemberProps) {
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

  get id() { return this._id; }
  get conversationId() { return this._conversationId; }
  get userId() { return this._userId; }
  get displayName() { return this._displayName; }
  get role() { return this._role; }
  get joinedAt() { return this._joinedAt; }
  get pinnedAt() { return this._pinnedAt; }
  get mutedUntil() { return this._mutedUntil; }
  get lastReadAt() { return this._lastReadAt; }
  get deletedAt() { return this._deletedAt; }
}
