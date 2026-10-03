This file is intended to describe what data can be accessed by who, with reasoning.
It's mostly so that if you spot something you think should be more private than it is, you can check if it is a vulnerability.

The backend is divided into 2 parts, a few normal http endpoints for session management (login, logout, etc.) and one graphql endpoint.
Session currently is stored only on client's side, the server generates an encrypted and signed id cookie that contains only user's account id.
Additionally on each request that id is checked for account existence.
Graphql endpoint is protected and any request without a valid session cookie is rejected with http 401.

Race conditions are considered fine as the request take a minimal amount of time and a few milliseconds are not gonna make a difference.
What I mean by that is if user A sends a get request and while that request is being processed user B sends a request to revoke user's A access, the first request will still be completed.

Data leaks like returning `not found` (as opposed to `forbidden`) on a task on a board user doesn't have access to are considered fine.

graphql query:

- `me` returns only data for session user therefore it can be accessed by any logged in user.
- `users` and `user` returns data for all users, since the intended usage is one hosted backend per organization it is fine.
- `boards` and `board` returns only boards user has access to or every board if user is an admin.
- `tasks` and `task` returns only the tasks on boards user has access to or all tasks if user is an admin.
- `user { invite }` can only be accessed by admins or the user themself.

graphql mutation:

- `createUser` can only be run by admins.
- `addUserEmail`, `deleteUserEmail` and `deleteUser` can be run by the user themself or by admins.
- `createBoard` can only be run by admins.
- `updateBoard` and `deleteBoard` can be run by board moderators or admins.
- `createTask` can be run by all users with access to the board or admins. `Author` must be one of the emails associated with the user.
- `updateTask` and `deleteTask` can be run by all users with access to the board or admins.
- `addAccess` can be run by board moderators or admins. This mutation can also change access level if the target has access already; board moderators can only change access level up while no such restriction exists for admins.
- `removeAccess` can be run by board moderators, but only by admins when the target is a board moderator too.
- `addInvite` and `removeInvite` can by run by the user or by admins.
- `addTaskStatus`, `updateTaskStatus` and `removeTaskStatus` can be run by board moderators or admins.

Invites may only be used once.

The frontend doesn't really store any data therefore can by default be loaded by everyone.
