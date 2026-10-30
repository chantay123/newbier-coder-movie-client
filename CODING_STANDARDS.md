# Project Coding Standards & Guidelines

This document outlines the mandatory development standards and conventions for the project codebase.

---

### 1. English Function Comments (JSDoc format)

- Every function, hook, and major utility must include concise English comments describing:
  - **Purpose**: A short 1-line description of what the function does.
  - **@param (Input)**: Name, type, and brief explanation of inputs.
  - **@returns (Output)**: Return type and what is returned.
- Example:
  ```javascript
  /**
   * Filters a list of movies based on specified category identifier.
   * @param {Array<Object>} movies - Array of movie objects.
   * @param {string} categoryId - Identifier of category (e.g. 'series', 'single').
   * @returns {Array<Object>} Filtered movie list.
   */
  export const filterMoviesByCategory = (movies, categoryId) => { ... };
  ```

---

### 2. Single Responsibility & Function Decomposition

- Do not write massive monolithic functions or chain endless expressions from top to bottom.
- Split UI rendering and business logic into small, testable, and reusable helper functions.
- Keep components focused purely on presentation; delegate data transformation to helper functions.

---

### 3. Config Over Hardcoding (Prioritize Environment Variables)

- Never hardcode API endpoints, fallback text, pagination limits, or URLs directly in UI code.
- Centralize all configurations in `src/config/` and reference environment variables via `process.env.NEXT_PUBLIC_*`.
- Provide sensible defaults through configuration objects instead of in-line strings.

---

### 4. Zero Code Smells & Zero Dead Code

- Avoid N+1 API fetching anti-patterns (e.g., looping `fetch` requests inside `.map()`).
- Remove unused imports, dead variables, and legacy commented-out code.
- Prevent infinite re-renders by properly declaring dependencies in `useEffect`.

---

### 5. Atomic & Frequent Commits

- Commit code sequentially and incrementally. Do not batch everything into a single massive commit at the end.
- Use Conventional Commits with concise, clear English messages:
  - `feat(...)`: New feature or UI section
  - `refactor(...)`: Code restructuring without behavioral regression
  - `fix(...)`: Bug fix
  - `docs(...)`: Documentation updates
---

### 6. Clear English Comments for Fresher & Intern Developers

All comments and documentation must be written in **clear, simple, professional English**. Write comments as an experienced Senior Developer who is helping Fresher and Intern developers understand the codebase and learn how the system works.

The goal is not to add comments everywhere. The goal is to make the code easier to understand, maintain, debug, and extend.

#### 6.1. General Commenting Rules

- Use simple English and short sentences. Prefer common words over complex technical vocabulary.
- Explain the purpose of the code, why it exists, and how it works when the logic is not obvious.
- Help junior developers understand the business flow without needing to ask another developer to explain every step.
- Comments must describe the current behavior of the code. Update comments whenever the implementation changes.
- Do not write comments that simply repeat the code.
- Do not add comments that provide no useful information.
- Avoid vague comments such as `// Handle data`, `// Do something`, or `// Process result`.
- Do not use Vietnamese in source code comments, JSDoc, TODOs, or inline documentation. Use English consistently.
- Keep comments concise, accurate, and close to the code they explain.
- Never add a comment claiming that a function, API, or behavior works correctly unless the implementation supports that claim.

#### 6.2. JSDoc for Functions, Hooks, and Utilities

Every exported function, custom React hook, and major utility must have a JSDoc comment.

Include the following information when applicable:

- **Purpose:** Explain what the function does in one or two simple sentences.
- **`@param`:** Describe each important input, including its expected type and purpose.
- **`@returns`:** Explain what the function returns and what the result represents.
- **`@throws`:** Document important errors that the function may throw, when relevant.
- **`@example`:** Add a short example only when it makes a complex API easier to understand.

Use TypeScript types as the source of truth when the project uses TypeScript. Do not duplicate complex type definitions in JSDoc unless necessary.

Example:

```ts
/**
 * Filters movies by their category.
 *
 * This helper keeps the filtering logic separate from the UI,
 * so the same rule can be reused in different components.
 *
 * @param movies - Movies returned by the API.
 * @param categoryId - Category to display, such as "series" or "single".
 * @returns Movies that match the selected category.
 */
export function filterMoviesByCategory(
  movies: Movie[],
  categoryId: string
): Movie[] {
  return movies.filter((movie) => movie.categoryId === categoryId);
}
```

For a React hook:

```ts
/**
 * Loads the details of a movie and exposes its loading state.
 *
 * The page uses this hook to get movie data without handling
 * API request details directly inside the UI component.
 *
 * @param movieId - ID of the movie to load.
 * @returns Movie data, loading status, and any request error.
 */
export function useMovieDetail(movieId: string) {
  // Implementation goes here.
}
```

The examples above are illustrative. Use the actual project types, return values, and behavior when documenting existing code.

#### 6.3. Explain the Data Flow

When code connects multiple layers, add a short comment where it helps junior developers follow the flow.

For example, explain the relationship between:

`Page → Hook → API Service → Backend → Response Mapping → UI`

Comments should clarify:
- Where the data comes from.
- Why a transformation is needed.
- Which layer is responsible for each operation.
- What the next layer expects to receive.
- How errors or empty results are handled.

Do not add the same flow comment to every file. Document important boundaries and refer to existing helpers where appropriate.

Example:

```ts
/**
 * Loads movie data through the shared API service.
 *
 * The service handles the HTTP request, while this hook manages
 * loading, success, and error states for the page.
 */
```

#### 6.4. Comments for Business Logic

Explain the reason behind non-obvious business rules, especially rules involving:

- Authentication and authorization.
- API response normalization.
- Movie filtering and sorting.
- Trailer validation and URL selection.
- Pagination and caching.
- Retry logic and request cancellation.
- Empty states and fallback behavior.
- Data consistency between frontend and backend.

Example:

```ts
// Prefer the URL stored in the trailer object because it is the
// primary source of truth for the actual trailer.
const trailerUrl = movie.trailer?.url || "";
```

Only use this comment if the project has actually defined `movie.trailer.url` as the primary source. Comments must reflect the real data contract, not an assumption.

#### 6.5. Comments for Complex Conditions

If a condition contains multiple branches or represents an important business rule, explain why those branches exist.

Avoid:

```ts
// Check the user.
if (user && user.id && user.isActive) {
  // ...
}
```

Prefer:

```ts
// Only active users with a valid ID can access this operation.
if (user && user.id && user.isActive) {
  // ...
}
```

Do not add explanatory comments to every simple `if`, `map`, `filter`, or variable assignment. Use comments when the intent is not obvious from the code.

#### 6.6. Comments for Error Handling

Error-handling comments must explain the reason for the fallback or recovery behavior.

Example:

```ts
try {
  return await movieService.getDetails(movieId);
} catch (error) {
  // Keep the page in control of the error state instead of
  // allowing the failed request to break the entire view.
  throw error;
}
```

Do not swallow errors silently. If a function handles an error, document the expected behavior when it is not obvious.

Do not add comments that promise a retry, fallback, or recovery unless that behavior is implemented.

#### 6.7. TODO and FIXME Rules

Write actionable TODO and FIXME comments in English.

Use:
- `TODO:` for planned work that is not required for the current fix.
- `FIXME:` for a known defect that still needs attention.
- `NOTE:` for important implementation details that are easy to miss.

Every TODO or FIXME must describe the remaining work clearly. Include a ticket or issue reference when the project has one.

Examples:

```ts
// TODO: Add pagination after the backend endpoint supports page parameters.

// FIXME: Handle expired sessions before retrying the protected request.

// NOTE: This endpoint returns a wrapped response, so the service extracts
// the data field before passing the result to the hook.
```

Do not leave obsolete TODOs, temporary debugging comments, commented-out implementations, or personal notes in production code.

#### 6.8. Comments for React Components and Hooks

For components and hooks, explain their responsibility rather than describing every JSX element.

Add comments when useful for:
- Complex state transitions.
- Non-obvious `useEffect` dependencies.
- Request cancellation and cleanup.
- Shared state between components.
- Data fetching and cache behavior.
- Conditional rendering based on business rules.

Do not use comments to compensate for poor component structure. If a component is too difficult to explain, split it into smaller components or move business logic into a suitable hook or utility.

#### 6.9. Comment Quality Checklist

Before completing a task, verify:

- [ ] All exported functions, custom hooks, and major utilities have appropriate English JSDoc.
- [ ] Important inputs and return values are documented.
- [ ] Complex business rules explain why they exist.
- [ ] Important data-flow boundaries are easy for a Fresher to follow.
- [ ] Comments use simple, readable English.
- [ ] Comments match the actual implementation.
- [ ] No redundant comments merely repeat the code.
- [ ] No obsolete TODOs, FIXME notes, or commented-out code remain.
- [ ] No Vietnamese comments or temporary debugging notes were introduced.

#### 6.10. Senior Developer Responsibility

Act as an experienced Senior Developer mentoring Fresher and Intern developers.

When adding or modifying code:
1. Understand the existing implementation before writing comments.
2. Explain important decisions in simple English.
3. Keep business logic separated from UI rendering.
4. Prefer descriptive names and small functions over excessive comments.
5. Update existing comments if behavior changes.
6. Avoid rewriting unrelated code just to add documentation.
7. Review the final changes to ensure the code is understandable without creating unnecessary noise.

**Definition of Done:** A Fresher or Intern should be able to understand the purpose of a function, its inputs and outputs, its place in the data flow, and any important business rules by reading the code and its relevant comments.