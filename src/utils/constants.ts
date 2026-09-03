export const UserRolesEnum = {
    ADMIN: "admin",
    PROJECT_ADMIN: "project_admin",
    MEMBER: "member",
} as const;

export type UserRole = (typeof UserRolesEnum)[keyof typeof UserRolesEnum];

export const AvailableUserRole: readonly UserRole[] = Object.values(UserRolesEnum);

export const TaskStatusEnum = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done",
} as const;

export type TaskStatus = (typeof TaskStatusEnum)[keyof typeof TaskStatusEnum];

export const AvailableTaskStatues: readonly TaskStatus[] = Object.values(TaskStatusEnum);
