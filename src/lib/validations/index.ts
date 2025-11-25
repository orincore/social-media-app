import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .refine((val) => !val.startsWith('_'), 'Username cannot start with underscore')
  .refine((val) => !val.endsWith('_'), 'Username cannot end with underscore');

export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(50, 'Display name must be at most 50 characters')
  .trim();

export const bioSchema = z
  .string()
  .max(160, 'Bio must be at most 160 characters')
  .optional();

export const locationSchema = z
  .string()
  .max(50, 'Location must be at most 50 characters')
  .optional();

export const websiteSchema = z
  .string()
  .url('Please enter a valid URL')
  .optional()
  .or(z.literal(''));

export const genderSchema = z
  .enum(['male', 'female', 'other', 'prefer_not_to_say'])
  .optional();

export const birthDateSchema = z
  .string()
  .refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 13 && age <= 120;
  }, 'You must be at least 13 years old')
  .optional();

export const onboardingSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  bio: bioSchema,
  location: locationSchema,
  website: websiteSchema,
  gender: genderSchema,
  birth_date: birthDateSchema,
});

export const postContentSchema = z
  .string()
  .min(1, 'Post content cannot be empty')
  .max(280, 'Post content must be at most 280 characters')
  .trim();

export const commentContentSchema = z
  .string()
  .min(1, 'Comment cannot be empty')
  .max(280, 'Comment must be at most 280 characters')
  .trim();

export const createPostSchema = z.object({
  content: postContentSchema,
  media_urls: z.array(z.string().url()).max(4, 'Maximum 4 media files allowed').optional(),
  reply_to_id: z.string().uuid().optional(),
});

export const createCommentSchema = z.object({
  content: commentContentSchema,
  post_id: z.string().uuid(),
  media_urls: z.array(z.string().url()).max(2, 'Maximum 2 media files allowed').optional(),
  reply_to_id: z.string().uuid().optional(),
});

export const updateProfileSchema = z.object({
  display_name: displayNameSchema.optional(),
  bio: bioSchema,
  location: locationSchema,
  website: websiteSchema,
  is_private: z.boolean().optional(),
});

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  type: z.enum(['users', 'posts', 'hashtags', 'all']).default('all'),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export const feedSchema = z.object({
  type: z.enum(['all', 'following', 'trending']).default('all'),
  hashtag: z.string().optional(),
  user_id: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export const uploadSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(['avatar', 'banner', 'post_media', 'message_media']),
});

export const fileValidationSchema = z.object({
  size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  type: z.string().refine(
    (type) => {
      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
      ];
      return validTypes.includes(type);
    },
    'Invalid file type'
  ),
});

export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  chat_id: z.string().uuid(),
  media_urls: z.array(z.string().url()).max(2, 'Maximum 2 media files allowed').optional(),
});

export const createChatSchema = z.object({
  participant_ids: z.array(z.string().uuid()).min(1, 'At least one participant required'),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const rateLimitSchema = z.object({
  key: z.string(),
  limit: z.number().positive(),
  window: z.number().positive(),
});

export type OnboardingData = z.infer<typeof onboardingSchema>;
export type CreatePostData = z.infer<typeof createPostSchema>;
export type CreateCommentData = z.infer<typeof createCommentSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type SearchData = z.infer<typeof searchSchema>;
export type FeedData = z.infer<typeof feedSchema>;
export type UploadData = z.infer<typeof uploadSchema>;
export type MessageData = z.infer<typeof messageSchema>;
export type CreateChatData = z.infer<typeof createChatSchema>;
export type PaginationData = z.infer<typeof paginationSchema>;
