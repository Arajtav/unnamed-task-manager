export const ME_QUERY = `
    query Me {
        me {
            id
            createdAt
            isAdmin
            emails { email }
            handle
        }
    }
`;

export const USERS_QUERY = `
    query Users {
        users {
            id
            createdAt
            isAdmin
            emails { email }
        }
    }
`;

export const ADD_ACCESS_MUTATION = `
    mutation AddAccess($boardId: Int!, $userId: UUID!, $isModerator: Boolean!) {
        addAccess(boardId: $boardId, userId: $userId, isModerator: $isModerator) {
            userId
            isModerator
        }
    }
`;

export const REMOVE_ACCESS_MUTATION = `
    mutation RemoveAccess($boardId: Int!, $userId: UUID!) {
        removeAccess(boardId: $boardId, userId: $userId)
    }
`;

export const USER_QUERY = `
    query User($id: UUID!) {
        user(id: $id) {
            id
            createdAt
            isAdmin
        }
    }
`;

export const BOARDS_QUERY = `
    query Boards($name: String) {
        boards(name: $name) {
            id
            name
            createdAt
        }
    }
`;

export const BOARD_QUERY = `
    query Board($id: Int!) {
        board(id: $id) {
            id
            name
            createdAt
            tasks {
                id
                title
                description
                createdAt
                author
            }
            access {
                userId
                isModerator
            }
        }
    }
`;

export const TASKS_QUERY = `
    query Tasks($title: String) {
        tasks(title: $title) {
            id
            title
            description
            createdAt
            author
        }
    }
`;

export const CREATE_BOARD_MUTATION = `
    mutation CreateBoard($name: String!) {
        createBoard(name: $name) {
            id
            name
            createdAt
        }
    }
`;

export const TASK_QUERY = `
    query Task($id: Int!) {
        task(id: $id) {
            id
            title
            description
            createdAt
            author
        }
    }
`;

export const CREATE_TASK_MUTATION = `
    mutation CreateTask($boardId: Int!, $title: String!, $description: String, $author: String!) {
        createTask(boardId: $boardId, title: $title, description: $description, author: $author) {
            id
            title
            description
            createdAt
            author
        }
    }
`;

export const ADD_USER_EMAIL = `
    mutation AddUserEmail($userId: UUID!, $email: String!) {
        addUserEmail(userId: $userId, email: $email) {
            email
        }
    }
`;

export const DELETE_USER_EMAIL = `
    mutation DeleteUserEmail($userId: UUID!, $email: String!) {
        deleteUserEmail(userId: $userId, email: $email)
    }
`;

export const SET_USER_HANDLE = `
    mutation SetUserHandle($userId: UUID!, $handle: String) {
        setUserHandle(userId: $userId, handle: $handle) {
            id
            createdAt
            isAdmin
            emails {
                email
            }
            handle
        }
    }
`;
