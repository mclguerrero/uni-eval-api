const { createCrudModule } = require('@common/crud/base');

const rol = createCrudModule({
  name: 'rol',
  route: '/rol',
  displayName: 'Rol',
  schemaName: 'Rol',
  disable: ['create'],
},
null,
{
  offOperations: ['create'],
});

const user_rol = createCrudModule({
  name: 'user_rol',
  route: '/user/rol',
  displayName: 'User Rol',
  schemaName: 'UserRol',
});

module.exports = {
  rol,
  user_rol,
};
