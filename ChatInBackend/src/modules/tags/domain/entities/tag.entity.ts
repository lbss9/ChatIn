export type TagProps = {
  id?: string;
  userId: string;
  name: string;
  emoji?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  conversationIds: string[];
  order: number;
};

export class TagEntity {
  private readonly _id?: string;
  private readonly _userId: string;
  private readonly _name: string;
  private readonly _emoji: string | null;
  private readonly _color: string | null;
  private readonly _imageUrl: string | null;
  private readonly _conversationIds: string[];
  private readonly _order: number;

  constructor(props: TagProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._name = props.name;
    this._emoji = props.emoji ?? null;
    this._color = props.color ?? null;
    this._imageUrl = props.imageUrl ?? null;
    this._conversationIds = props.conversationIds ?? [];
    this._order = props.order;
  }

  get id() { return this._id; }
  get userId() { return this._userId; }
  get name() { return this._name; }
  get emoji() { return this._emoji; }
  get color() { return this._color; }
  get imageUrl() { return this._imageUrl; }
  get conversationIds() { return this._conversationIds; }
  get order() { return this._order; }
}
