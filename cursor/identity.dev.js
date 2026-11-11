// Runtime twin of identity.dev.ts for bundlers that resolve the .js import
// from cursor/identity.ts. Keep fields in sync with identity.dev.ts.
export const DEV_VIEWER = {
  sub: "user:dev",
  email: "dev@example.com",
  name: "Dev Viewer",
  teamId: 1,
  teamRole: "admin",
}
