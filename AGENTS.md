# AGENTS.md - FE-SWP

## Project
- Project: SWP391
- Frontend repository: FE-SWP
- Framework: React
- Build tool: Vite
- Language: JavaScript
- Routing: React Router
- HTTP client: Axios
- UI: Bootstrap + CSS

## Architecture
Keep frontend responsibilities separated:

Pages
    -> Components
        -> API/Services
            -> Backend

Rules:
- Page components handle page-level UI and flow.
- Reusable UI belongs in components.
- API calls should use the shared Axios configuration.
- Do not put large amounts of business/API logic directly inside UI components.
- Reuse existing components where possible.

## Backend Connection
Backend:
http://localhost:8080

Frontend development server:
http://localhost:5173

Use the existing Axios instance if available.

Do not repeatedly write:

axios.post("http://localhost:8080/...")

Prefer the shared API client.

## Authentication
Login endpoint:

POST /api/auth/login

Actual Backend response:

{
  "success": true,
  "message": "...",
  "data": {
    "accessToken": "...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "userId": 1,
      "fullName": "...",
      "username": "...",
      "email": "...",
      "role": "...",
      "status": "Active"
    }
  }
}

Important:
- Read `response.data.data`.
- Access token:
  response.data.data.accessToken
- User information:
  response.data.data.user
- Role:
  response.data.data.user.role
- Do not expect `roleId` from the current login response.
- Never store password.
- Do not log password.
- Do not hard-code logged-in users.

## Roles and Routes
Current roles:

- Center Manager
- Receptionist
- Coach
- Member

Routes:

- Member -> /member
- Receptionist -> /receptionist
- Coach -> /coach
- Center Manager -> /center-manager

Role matching must use the actual role string returned by Backend.

Do not use:
- Admin
- roleId

unless Backend is explicitly changed.

## Protected Routes
Protected pages must require valid authentication.

Examples:
- /member
- /receptionist
- /coach
- /center-manager

Users must not access another role's dashboard.

Example:
- Member must not access /coach.
- Coach must not access /center-manager.

## Logout
Logout must:
1. Remove accessToken.
2. Remove stored user/auth information.
3. Clear auth state.
4. Navigate to `/`.

## Register
Do not invent Register API.

Before implementing Register:
- Inspect Backend contract.
- Use the exact endpoint and request structure.
- Only allow Member registration according to Backend business rules.
- Do not expose a role selector allowing users to create Coach, Receptionist, or Center Manager.

## UI / Stitch
Stitch is the UI/reference source.

When implementing a screen:
- Respect the provided Stitch design.
- Keep layout, colors, spacing, typography, sidebar and cards consistent.
- Do not copy business logic from Stitch.
- Stitch provides UI reference, not Backend API rules.

Current Center Manager Stitch screens may include:
- Dashboard
- User Management
- Subject Management
- Package Management
- Class Management
- Audit Log

Implement business functionality only when the Backend API exists.

## Mock Data
Do not keep mock authentication in production code.

Avoid:
- setTimeout pretending login/register succeeded
- hard-coded users
- fake token
- fake role
- fake API success

Temporary mock data may only be used when explicitly requested for UI development.

## API Rules
- Do not invent endpoints.
- Do not assume a response structure.
- Inspect Backend contract before integrating.
- Handle loading, success, validation, and error states.

## Coding Rules
- Read existing files before modifying them.
- Reuse existing components and styles.
- Avoid duplicate components.
- Avoid unnecessary dependencies.
- Keep naming consistent with the current project.
- Do not rewrite unrelated files.

## Git
- Do not commit directly to `main`.
- Work on feature branches.

Example:
feature/fe-center-manager-user

Commit format:
- feat:
- fix:
- refactor:
- docs:
- test:

## Testing
After changes:
1. Run npm run build.
2. Run npm run lint if available.
3. Check browser console.
4. Check Network requests.
5. Verify routing.
6. Verify login/logout.
7. Verify protected routes.

## Important Team Rule
When task says FE only:
- Do not modify Backend.

When task says BE only:
- Do not modify Frontend.

When integrating an API:
- Follow actual Backend response exactly.
- Never guess field names.