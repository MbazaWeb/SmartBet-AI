// src/components/Social/CommentForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import useAuth from '../../context/useAuth'
import { useAddCommentMutation } from '../../hooks/useMatchSocial'

const commentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment is too long'),
})

type CommentFormData = z.infer<typeof commentSchema>

interface CommentFormProps {
  fixtureId: string | number
  parentId?: string | null
  onSuccess?: () => void
}

export function CommentForm({ fixtureId, parentId = null, onSuccess }: CommentFormProps) {
  const { user } = useAuth()
  const addComment = useAddCommentMutation(fixtureId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  })

  const onSubmit = async (data: CommentFormData) => {
    if (!user) {
      alert('Please sign in to comment')
      return
    }

    try {
      await addComment.mutateAsync({
        parentId,
        authorId: user.id,
        authorName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
        body: data.body,
      })
      reset()
      onSuccess?.()
    } catch (error) {
      console.error('Failed to post comment:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
      <textarea
        {...register('body')}
        placeholder="Add a comment..."
        className="w-full rounded-2xl border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        rows={3}
        disabled={isSubmitting}
      />
      {errors.body && (
        <p className="mt-1 text-xs text-red-400">{errors.body.message}</p>
      )}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !user}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </form>
  )
}