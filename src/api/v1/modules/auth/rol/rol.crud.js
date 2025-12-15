const { createCrudModule } = require('@common/crud/base');

const rol = createCrudModule({
  name: 'rol',
  route: '/rol',
  displayName: 'Rol',
  schemaName: 'Rol',
  disable: ['create'],
});

const user_rol = createCrudModule({
  name: 'user_rol',
  route: '/user/rol',
  displayName: 'User Rol',
  schemaName: 'UserRol',
});

const user_prog = createCrudModule({
  name: 'user_prog',
  route: '/user/prog',
  displayName: 'User Prog',
  schemaName: 'UserProg',
});

module.exports = {
  rol,
  user_rol,
  user_prog,
};
