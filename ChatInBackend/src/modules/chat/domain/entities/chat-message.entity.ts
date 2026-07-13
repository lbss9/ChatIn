export type MessageReaction = { emoji: string; userIds: string[] };
export type MessageReplyContext = { id: string; senderName: string; content: string };

export type ChatMessageProps = {
  id?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt?: Date;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  replyTo?: MessageReplyContext | null;
  reactions?: MessageReaction[];
};

export class ChatMessageEntity {
  private readonly _id?: string;
  private readonly _conversationId: string;
  private readonly _senderId: string;
  private readonly _senderName: string;
  private readonly _content: string;
  private readonly _createdAt: Date;
  private readonly _editedAt: Date | null;
  private readonly _deletedAt: Date | null;
  private readonly _replyTo: MessageReplyContext | null;
  private readonly _reactions: MessageReaction[];

  constructor(props: ChatMessageProps) {
    this._id = props.id;
    this._conversationId = props.conversationId.trim();
    this._senderId = props.senderId.trim();
    this._senderName = props.senderName.trim();
    this._content = props.content.trim();
    this._createdAt = props.createdAt ?? new Date();
    this._editedAt = props.editedAt ?? null;
    this._deletedAt = props.deletedAt ?? null;
    this._replyTo = props.replyTo ?? null;
    this._reactions = props.reactions ?? [];
  }

  get id() { return this._id; }
  get conversationId() { return this._conversationId; }
  get senderId() { return this._senderId; }
  get senderName() { return this._senderName; }
  get content() { return this._content; }
  get createdAt() { return this._createdAt; }
  get editedAt() { return this._editedAt; }
  get deletedAt() { return this._deletedAt; }
  get replyTo() { return this._replyTo; }
  get reactions() { return this._reactions; }
}
