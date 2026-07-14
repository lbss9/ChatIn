export type MessageReaction = { emoji: string; userIds: string[] };
export type MessageReplyContext = { id: string; senderName: string; content: string };
export type MessageAttachmentType = 'image' | 'audio' | 'video' | 'document';
export type MessageAttachment = {
  type: MessageAttachmentType;
  url: string;
  name: string;
  mimeType: string;
  size: number;
};
export type MessagePollOption = { id: string; text: string; voterIds: string[] };
export type MessagePoll = {
  question: string;
  options: MessagePollOption[];
  allowMultiple: boolean;
  closedAt?: Date | null;
};

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
  attachments?: MessageAttachment[];
  poll?: MessagePoll | null;
};

export class ChatMessageEntity {
  private readonly _id?: string;
  private readonly _conversationId!: string;
  private readonly _senderId!: string;
  private readonly _senderName!: string;
  private readonly _content!: string;
  private readonly _createdAt!: Date;
  private readonly _editedAt!: Date | null;
  private readonly _deletedAt!: Date | null;
  private readonly _replyTo!: MessageReplyContext | null;
  private readonly _reactions!: MessageReaction[];
  private readonly _attachments!: MessageAttachment[];
  private readonly _poll!: MessagePoll | null;

  public constructor(props: ChatMessageProps) {
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
    this._attachments = props.attachments ?? [];
    this._poll = props.poll ?? null;
  }

  public get id() {
    return this._id;
  }
  public get conversationId() {
    return this._conversationId;
  }
  public get senderId() {
    return this._senderId;
  }
  public get senderName() {
    return this._senderName;
  }
  public get content() {
    return this._content;
  }
  public get createdAt() {
    return this._createdAt;
  }
  public get editedAt() {
    return this._editedAt;
  }
  public get deletedAt() {
    return this._deletedAt;
  }
  public get replyTo() {
    return this._replyTo;
  }
  public get reactions() {
    return this._reactions;
  }
  public get attachments() {
    return this._attachments;
  }
  public get poll() {
    return this._poll;
  }
}
