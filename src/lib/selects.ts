export const userLite = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
} as const;

export const userSelf = {
    id: true,
    username: true,
    email: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
} as const;