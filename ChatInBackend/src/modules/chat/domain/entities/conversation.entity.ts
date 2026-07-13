export type ConversationType = 'group' | 'direct';

export type ConversationProps = {
  id?: string;
  title: string;
  type: ConversationType;
  createdById: string;
  lastMessagePreview?: string;
  lastMessageAt?: Date;
  createdAt?: Date;
};

export class ConversationEntity {
  private readonly _id?: string;
  private readonly _title: string;
  private readonly _type: ConversationType;
  private readonly _createdById: string;
  private readonly _createdAt: Date;
  private _lastMessagePreview?: string;
  private _lastMessageAt?: Date;

  constructor(props: ConversationProps) {
    this._id = props.id;
    this._title = props.title.trim();
    this._type = props.type;
    this._createdById = props.createdById;
    this._lastMessagePreview = props.lastMessagePreview;
    this._lastMessageAt = props.lastMessageAt;
    this._createdAt = props.createdAt ?? new Date();
  }

  get id() { return this._id; }
  get title() { return this._title; }
  get type() { return this._type; }
  get createdById() { return this._createdById; }
  get lastMessagePreview() { return this._lastMessagePreview; }
  get lastMessageAt() { return this._lastMessageAt; }
  get createdAt() { return this._createdAt; }

  markLastMessage(content: string, at = new Date()) {
    this._lastMessagePreview = content.trim().slice(0, 140);
    this._lastMessageAt = at;
  }
}
