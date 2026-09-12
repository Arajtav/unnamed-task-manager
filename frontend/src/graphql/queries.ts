export const ME_QUERY = `
    query Me {
        me {
            id
            createdAt
            isAdmin
        }
    }
`;

export const MY_EMAILS_QUERY = `
    query MyEmails {
        me {
            emails {
                email
            }
        }
    }
`;

export const USERS_QUERY = `
    query Users {
        users {
            id
            createdAt
            isAdmin
        }
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
