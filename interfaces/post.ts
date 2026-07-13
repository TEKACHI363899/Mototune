export interface IComment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: number;
}

export interface IPost {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: number;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  likedBy?: string[];
  isShared?: boolean;
  sharedFromStr?: string;
}
