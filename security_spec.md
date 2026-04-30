# Security Specification - PocketHealth AI

## Data Invariants
1. A chat session must belong to a verified user.
2. A user can only read and write their own chat sessions.
3. Message timestamps are server-generated and immutable after creation.
4. User profiles are private to the user.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Spoofing**: Attempt to create a chat session with `userId` of another user.
2. **Identity Spoofing**: Attempt to read another user's chat session.
3. **Ghost Field Injection**: Adding `isAdmin: true` to a user profile.
4. **Timestamp Manipulation**: Providing a client-side `createdAt` in the past.
5. **Update Bypass**: Attempting to change the `userId` of an existing chat session.
6. **Mass Reading**: Listing all chat sessions without a filter on `userId`.
7. **Resource Poisoning**: Providing a 1MB string as a message text.
8. **Resource Poisoning**: Providing an invalid document ID (e.g., path traversal).
9. **State Shortcut**: Setting a session status to "archived" without proper ownership.
10. **Unauthorized PII Access**: Reading the 'private' subcollection of another user.
11. **Orphaned Writes**: Creating a message without a valid session.
12. **Immutable Violation**: Changing the `text` of a message after it's been sent.

## Test Runner
See `firestore.rules.test.ts` for implementation.
