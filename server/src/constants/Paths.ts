/**
 * Express router paths go here.
 */


export default {
  Base: '/api',
  Users: {
    Base: '/users',
    Get: '/:username',
    Update: '/update',
  },
  Auth: {
    Base: '/auth',
    GetToken: '/get-token',
  }
} as const;
