// src/lib/social/types.ts
export interface Comment {
  id: string
  author: string
  text: string
  createdAt: string
  replies: Comment[]
}

export interface MatchThread {
  likesCount: number
  isLiked: boolean
  comments: Comment[]
}

export interface CommentInput {
  fixtureId: string | number
  parentId?: string | null
  authorId: string
  authorName: string
  body: string
}