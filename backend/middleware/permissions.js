const rolePermissions = {
  superadmin: ['*'],
  admin: [
    'users:read',
    'transactions:read',
    'bills:read',
    'pricing:read',
    'finance:read',
    'notify:send',
    'support:chat',
  ],
  operations: [
    'users:read',
    'users:kyc',
    'transactions:read',
    'transactions:write',
    'bills:read',
    'bills:write',
    'accounts:read',
    'accounts:write',
    'notify:send',
    'support:chat',
  ],
  support: ['users:read', 'users:kyc', 'support:chat', 'accounts:read'],
  finance: [
    'transactions:read',
    'transactions:write',
    'pricing:read',
    'pricing:write',
    'bills:read',
    'finance:read',
  ],
  compliance: ['audit:read', 'users:read'],
};

export function requirePermission(permission) {
  return (req, res, next) => {
    const role = req.admin?.role || 'support';
    const allowed = rolePermissions[role] || [];
    if (allowed.includes('*') || allowed.includes(permission)) {
      return next();
    }
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

export { rolePermissions };
